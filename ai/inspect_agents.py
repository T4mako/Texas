import rlcard
import rlcard.agents
import rlcard.models
import inspect

print("Agents:")
for name, obj in inspect.getmembers(rlcard.agents):
    if inspect.isclass(obj):
        print(f" - {name}")

print("\nModels:")
# rlcard.models is usually a module, let's see what's in it or if there's a list function
try:
    print(rlcard.models.__all__)
except:
    pass
    
print(dir(rlcard.models))
