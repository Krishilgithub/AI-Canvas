# PowerShell script to remove mock data logic from automation.controller.ts
# Read the file
$filePath = "c:\Users\Krishil Agrawal\Desktop\College Works\SGPS\SGP6\ai-saas\backend\src\controllers\automation.controller.ts"
$content = Get-Content -Path $filePath -Raw

# Remove the if (this.useMockDb) blocks and keep only the 'else' content
# This regex pattern matches if (this.useMockDb) { ... } else { ... } and keeps only the else part

# For now, let's just count the occurrences
$mockDbMatches = [regex]::Matches($content, 'this\.useMockDb')
Write-Host "Found $($mockDbMatches.Count) references to useMockDb"

$mockStoreMatches = [regex]::Matches($content, 'mockStore')
Write-Host "Found $($mockStoreMatches.Count) references to mockStore"
