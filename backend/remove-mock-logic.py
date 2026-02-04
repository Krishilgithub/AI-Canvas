import re

# Read the file
with open('c:/Users/Krishil Agrawal/Desktop/College Works/SGPS/SGP6/ai-saas/backend/src/controllers/automation.controller.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# First, let's remove any if (this.useMockDb) { ... } else { ... } blocks and keep only the else parts
# This is a complex regex operation, so we'll do it iteratively

# Pattern to find simple if-else blocks
pattern = r'if \(this\.useMockDb\) \{([^}]*(?:\{[^}]*\}[^}]*)*)\} else \{([^}]*(?:\{[^}]*\}[^}]*)*)\}'

# This won't work well for nested braces. Let me use a state machine approach instead.

lines = content.split('\n')
output_lines = []
skip_until_brace_level = None
brace_count = 0
in_mock_block = False
mock_if_line_idx = -1

i = 0
while i < len(lines):
    line = lines[i]
    
    #Check if line contains 'if (this.useMockDb)'
    if 'if (this.useMockDb)' in line or 'if (! this.useMockDb)' in line or 'if (!this.useMockDb)' in line:
        # We're entering a mock conditional
        in_mock_block = True
        mock_if_line_idx = i
        skip_until_brace_level = line.count('{') - line.count('}')
        i += 1
        continue
    
    # If we're in a mock block, track braces
    if in_mock_block:
        skip_until_brace_level += line.count('{') - line.count('}')
        
        # Check if we've found the else clause
        if 'else {' in line and skip_until_brace_level == 1:
            # We're entering the else block -- start including lines again
            in_mock_block = False
            skip_until_brace_level = None
            i += 1
            continue
        
        # Check if the block ended without an else
        if skip_until_brace_level ==  0:
            in_mock_block = False
            skip_until_brace_level = None
            i += 1
            continue
        
        i += 1
        continue
    
    # Check if mockStore is referenced
    if 'mockStore' in line:
        # Skip this line
        i += 1
        continue
    
    output_lines.append(line)
    i += 1

# Write output
output = '\n'.join(output_lines)

# Also remove any remaining mockStore references
output = re.sub(r'.*mockStore.*\n', '', output)

# Write back
with open('c:/Users/Krishil Agrawal/Desktop/College Works/SGPS/SGP6/ai-saas/backend/src/controllers/automation.controller.ts', 'w', encoding='utf-8') as f:
    f.write(output)

print("Done! Removed mock logic from automation.controller.ts")
