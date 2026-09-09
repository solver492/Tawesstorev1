#!/usr/bin/expect -f

set timeout 20
set password "denden7skY-"

spawn ssh -p 65002 u696346042@147.93.54.128

expect {
    "password:" {
        send "$password\r"
        expect "$ "
        
        # Trouver l'application
        send "cd domains && ls -la\r"
        expect "$ "
        
        send "find domains -name 'package.json' -path '*/Tawesstorev1/*' 2>/dev/null\r"
        expect "$ "
        
        # Garder la session ouverte
        interact
    }
    timeout {
        puts "Connection timeout"
        exit 1
    }
}
