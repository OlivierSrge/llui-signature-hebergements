#!/usr/bin/env python3
"""Phase 1 : Reformulation écran Pass VIP"""

import shutil
from datetime import datetime

FICHIER = "app/sejour/[code]/SejourClient.tsx"

print("=" * 60)
print("PHASE 1 : REFORMULATION PASS VIP")
print("=" * 60)
print()

# Backup
backup = f"{FICHIER}.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
shutil.copy2(FICHIER, backup)
print(f"✅ Backup : {backup}")
print()

# Lecture
with open(FICHIER, 'r', encoding='utf-8') as f:
    content = f.read()

# Modification 1 : Titre Pass
old_title = "💎 Pass VIP Boutique L&amp;Lui"
new_title = "💎 Pass VIP L&amp;Lui Signature"
content = content.replace(old_title, new_title)
print("✅ Titre modifié")

# Modification 2 : Description
old_desc = "privilèges premium dans notre boutique"
new_desc = "offres privilégiées chez nos partenaires Kribi"
content = content.replace(old_desc, new_desc)
print("✅ Description modifiée")

# Écriture
with open(FICHIER, 'w', encoding='utf-8') as f:
    f.write(content)

print()
print("✅ TERMINÉ ! Vérifie puis commit.")
