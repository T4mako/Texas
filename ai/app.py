from flask import Flask, request, jsonify
import numpy as np
import random
from collections import OrderedDict
import rlcard
# from rlcard.agents import RandomAgent
from treys import Card as TreysCard, Evaluator as TreysEvaluator

app = Flask(__name__)

# Heuristic Agent Implementation
class HeuristicAgent:
    def __init__(self, num_actions):
        self.num_actions = num_actions
        self.evaluator = TreysEvaluator()

    def eval_step(self, state):
        # 0: Fold, 1: Check/Call, 2: Raise Half, 3: Raise Pot, 4: All-in
        legal_actions = list(state['legal_actions'].keys())
        raw_obs = state['raw_obs']
        
        hand_strs = raw_obs.get('hand', []) # e.g. ['H10', 'SA']
        public_strs = raw_obs.get('public_cards', [])
        
        # Convert cards to Treys format
        # Node: 'H10', 'SA', 'D2', 'C9', 'HK'
        # Treys: 'Th', 'As', '2d', '9c', 'Kh' (Rank + Suit lower)
        
        def to_treys(card_str):
            if not card_str: return None
            suit_map = {'H': 'h', 'D': 'd', 'C': 'c', 'S': 's'}
            
            suit_char = card_str[0]
            rank_str = card_str[1:]
            
            # Map Suit
            suit = suit_map.get(suit_char, 's')
            
            # Map Rank
            if rank_str == '10': rank = 'T'
            else: rank = rank_str
            
            return f"{rank}{suit}"

        hand = [TreysCard.new(to_treys(c)) for c in hand_strs if c]
        board = [TreysCard.new(to_treys(c)) for c in public_strs if c]
        
        score = 1.0 # Lower is better in Treys (1 is Royal Flush, 7462 is worst)
        # However, we want 0-1 strength (1 best)
        
        strength = 0.5
        
        if len(board) == 0:
            # Pre-flop heuristic
            # High cards, pairs are good
            ranks = [TreysCard.get_rank_int(c) for c in hand] # 0-12 (2-A)
            # A=12, K=11 ... 2=0
            # Wait, Treys ranks: 2=0, ..., A=12? Let's verify.
            # Treys: 2=0, 3=1... A=12.
            
            r1, r2 = sorted(ranks, reverse=True)
            is_pair = r1 == r2
            is_suited = TreysCard.get_suit_int(hand[0]) == TreysCard.get_suit_int(hand[1])
            
            if is_pair:
                if r1 >= 8: strength = 0.9 # 10+ pair
                elif r1 >= 5: strength = 0.7 # 7-9 pair
                else: strength = 0.6
            else:
                if r1 >= 10: # Q+ high
                    if r2 >= 9: strength = 0.75 # QJ+
                    elif is_suited: strength = 0.65
                    else: strength = 0.55
                elif r1 >= 8 and r2 >= 7: strength = 0.5 # Mid connectors
                else: strength = 0.3
        else:
            # Post-flop
            rank_score = self.evaluator.evaluate(board, hand)
            percentage = 1.0 - self.evaluator.get_five_card_rank_percentage(rank_score)
            strength = percentage # 0.0 to 1.0 (1.0 is best)
            
            # Adjustment for incomplete board (flop/turn) to be more aggressive on good draws?
            # For simplicity, stick to raw strength.

        print(f"Hand Strength: {strength:.2f}")

        # Decision Logic
        # Conservative but aggressive with good hands
        
        # Action map: 0:Fold, 1:Check/Call, 2:Raise Half, 3:Raise Pot, 4:AllIn
        
        chosen_action = 0 # Default Fold
        
        if strength > 0.9: # Monster
            if 4 in legal_actions: chosen_action = 4
            elif 3 in legal_actions: chosen_action = 3
            elif 2 in legal_actions: chosen_action = 2
            else: chosen_action = 1
            
        elif strength > 0.8: # Very Strong
            if 3 in legal_actions: chosen_action = 3
            elif 2 in legal_actions: chosen_action = 2
            else: chosen_action = 1
            
        elif strength > 0.6: # Strong/Good
            if 2 in legal_actions and random.random() > 0.3: chosen_action = 2 # Raise sometimes
            elif 1 in legal_actions: chosen_action = 1
            else: chosen_action = 0 # Fold to heavy aggression? Nah call.
            
            # If facing a huge bet (e.g. all in) and strength is just 0.6, maybe fold?
            # Need bet info.
            
        elif strength > 0.4: # Marginal
            if 1 in legal_actions: 
                # If check available, check
                # If call, check cost
                call_cost = raw_obs.get('current_bet', 0) - raw_obs.get('player_current_bet', 0)
                pot = raw_obs.get('pot', 0)
                pot_odds = call_cost / (pot + call_cost + 1)
                
                if call_cost == 0: chosen_action = 1 # Check
                elif strength > pot_odds + 0.1: chosen_action = 1 # Call if odds good
                else: chosen_action = 0
            else:
                chosen_action = 0
        else: # Weak
            if 1 in legal_actions: 
                 call_cost = raw_obs.get('current_bet', 0) - raw_obs.get('player_current_bet', 0)
                 if call_cost == 0: chosen_action = 1 # Check
                 else: chosen_action = 0 # Fold
            else:
                 chosen_action = 0

        # Fallback if chosen not legal
        if chosen_action not in legal_actions:
            # Try safer actions descending
            for fallback in [1, 0]:
                if fallback in legal_actions:
                    chosen_action = fallback
                    break
        
        return chosen_action, {}

NUM_ACTIONS = 5
agent = HeuristicAgent(num_actions=NUM_ACTIONS)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/get_action', methods=['POST'])
def get_action():
    try:
        data = request.json
        print(f"Received state: {data}")
        
        legal_actions_str = data.get('legal_actions', [])
        if not legal_actions_str:
            return jsonify({"action": "fold"})

        # 1. Map Node.js legal actions to RLCard legal actions
        rlcard_legal_actions = OrderedDict()
        
        # Always allow Fold if 'fold' is present (usually is)
        if 'fold' in legal_actions_str:
            rlcard_legal_actions[0] = None
            
        # Check/Call
        if 'check' in legal_actions_str or 'call' in legal_actions_str:
            rlcard_legal_actions[1] = None
            
        # Raise & All-in logic
        pot = data.get('pot', 0)
        current_bet = data.get('current_bet', 0)
        player_bet = data.get('player_current_bet', 0)
        chips = data.get('chips', 0)
        min_raise = data.get('min_raise', 0)
        
        call_cost = current_bet - player_bet
        
        if 'raise' in legal_actions_str:
            # Check Raise Half Pot
            # Raise amount = 0.5 * pot (after call? or current pot?)
            # Simplified: 0.5 * current pot
            half_pot_raise = int(0.5 * pot)
            if half_pot_raise < min_raise:
                half_pot_raise = min_raise
            
            if chips >= (call_cost + half_pot_raise):
                rlcard_legal_actions[2] = None
                
            # Check Raise Pot
            pot_raise = int(1.0 * pot)
            if pot_raise < min_raise:
                pot_raise = min_raise
                
            if chips >= (call_cost + pot_raise):
                rlcard_legal_actions[3] = None
                
        if 'all-in' in legal_actions_str:
            rlcard_legal_actions[4] = None

        # Fallback: if no actions mapped (e.g. only all-in but logic missed it), force fold or check
        if not rlcard_legal_actions:
             if 'check' in legal_actions_str:
                 rlcard_legal_actions[1] = None
             else:
                 rlcard_legal_actions[0] = None

        # 2. Construct State for RLCard Agent
        state = {
            'legal_actions': rlcard_legal_actions,
            'obs': np.zeros(54), # Placeholder if agent needs it (Random doesn't)
            'raw_obs': data # Pass full data if needed by custom agents
        }
        
        # 3. Get Action from Agent
        action_id, _ = agent.eval_step(state)
        print(f"Agent chose action id: {action_id}")
        
        # 4. Map back to Node.js action
        resp_action = 'fold'
        resp_amount = 0
        
        if action_id == 0:
            resp_action = 'fold'
        elif action_id == 1:
            if 'check' in legal_actions_str:
                resp_action = 'check'
            else:
                resp_action = 'call'
        elif action_id == 2: # Raise Half Pot
            resp_action = 'raise'
            half_pot_raise = int(0.5 * pot)
            if half_pot_raise < min_raise: half_pot_raise = min_raise
            resp_amount = current_bet + half_pot_raise
        elif action_id == 3: # Raise Pot
            resp_action = 'raise'
            pot_raise = int(1.0 * pot)
            if pot_raise < min_raise: pot_raise = min_raise
            resp_amount = current_bet + pot_raise
        elif action_id == 4:
            resp_action = 'all-in'
            resp_amount = 0 # Handled by server

        # Safety check: if we chose raise but it wasn't strictly legal in Node (due to race/calc), fallback
        if resp_action == 'raise' and 'raise' not in legal_actions_str:
            resp_action = 'call' if 'call' in legal_actions_str else 'check'

        return jsonify({
            "action": resp_action,
            "amount": resp_amount
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
