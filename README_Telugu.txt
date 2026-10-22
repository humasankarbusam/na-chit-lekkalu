నా చిట్ లెక్కలు — Supabase Cloud Sync (తెలుగు సూచనలు)

ముఖ్యమైనవి:
1. ముందుగా యాప్‌లో Backup తీసుకుని JSON ఫైల్‌ను భద్రంగా ఉంచండి.
2. Supabase SQL Editorలో supabase_setup.sql ఇప్పటికే Run చేసి Success వచ్చి, chit_cloud_data టేబుల్ మరియు RLS Policy కనిపిస్తే మళ్లీ SQL నడపాల్సిన అవసరం లేదు.
3. ZIPలోని index.html, app.js మాత్రమే మీ ప్రస్తుత యాప్ ఫోల్డర్‌లో భర్తీ చేయండి. పాత index.html, app.jsలను వేరే ఫోల్డర్‌లో బ్యాకప్‌గా ఉంచండి.
4. style.css, manifest.json, sw.js ఫైళ్లను మార్చవద్దు.
5. యాప్‌ను HTTPS వెబ్‌సైట్ ద్వారా ఓపెన్ చేసి Gmail/పాస్‌వర్డ్‌తో లాగిన్ చేయండి.
6. మొదటి లాగిన్‌లో cloud row లేకపోతే లేదా cloud data ఖాళీగా ఉండి local data ఉంటే, పాత browser dataను Supabaseలోకి upload చేస్తుంది. Cloudలో ఇప్పటికే data ఉంటే cloud data ఈ browserలో load అవుతుంది.
7. కొత్త చిట్/సభ్యుడు/చెల్లింపు సేవ్ చేసినప్పుడు browserతో పాటు cloudలో కూడా సేవ్ అవుతుంది. టోస్ట్ మెసేజ్‌లో cloud save అయిందని చూడండి.
8. ఇంకొక పరికరంలో వాడాలంటే అదే Supabase userతో లాగిన్ చేయండి.

జాగ్రత్త:
- Supabase publishable key browserలో వాడటానికి ఉద్దేశించబడింది; sb_secret/service_role key ఎప్పుడూ index.htmlలో పెట్టవద్దు.
- Cloud row ఇప్పటికే విలువైన data కలిగి ఉంటే, local dataతో కలిపే ముందు backup తీసుకోండి.
- ఈ sync పద్ధతి ఒక్క userకి ఒక JSON documentగా chits, members, payments నిల్వ చేస్తుంది.
