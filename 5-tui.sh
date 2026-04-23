 
 
 
 #!/bin/bash
ssh -t -i ../openclaw-hardened-ansible/nativobot.pem -p 2222 openclaw@52.200.214.27 "podman exec -it bot2-agent openclaw tui"
