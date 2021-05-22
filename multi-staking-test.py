import time
import subprocess

accs_file = open('accs.txt', 'r')
accs_key = accs_file.readlines()

secret_file = open(".secret", "w")

for acc_key in accs_key:
    secret_file.seek(0)
    secret_file.write(acc_key.strip())
    secret_file.truncate()
    subprocess.call(["python3", "/mnt/e/eth/graphlinq/GraphLinq.Engine/GraphLinq.GraphLinqERC20Contract/approvance.py", acc_key.strip()])
    subprocess.call(["truffle", "exec", "./test/staking-test.js"])

    time.sleep(1)