import rlcard.models
try:
    print("Attempting to load no-limit-holdem model...")
    model = rlcard.models.load('no-limit-holdem')
    print("Success!")
except Exception as e:
    print("Failed:", e)
