import traceback
import runpy

try:
    runpy.run_path('extra.py', run_name='__main__')
except Exception as e:
    with open('out_clean.txt', 'w', encoding='utf-8') as f:
        traceback.print_exc(file=f)
