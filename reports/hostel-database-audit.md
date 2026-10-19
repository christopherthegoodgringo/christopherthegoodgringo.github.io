# Read-only Hostel Database Audit

- Source: OpenStreetMap contributors
- Dataset timestamp: 2026-10-19T18:03:38.558527+00:00
- Total hostel records: **11536**
- Total city-index records: **46538**
- City index source: **data/cities.json (persistent)**
- No listing records were changed or deleted by this audit.

## Coverage by approved country

### Hostels
| Code | Country | Records |
|---|---|---|
| MX | Mexico | 821 |
| BZ | Belize | 36 |
| GT | Guatemala | 235 |
| HN | Honduras | 35 |
| SV | El Salvador | 87 |
| NI | Nicaragua | 400 |
| CR | Costa Rica | 341 |
| PA | Panama | 204 |
| AR | Argentina | 1312 |
| BO | Bolivia | 581 |
| CL | Chile | 1510 |
| CO | Colombia | 1372 |
| EC | Ecuador | 939 |
| PY | Paraguay | 91 |
| PE | Peru | 2389 |
| UY | Uruguay | 121 |
| CU | Cuba | 1016 |
| DO | Dominican Republic | 46 |

### City index
| Code | Country | Records |
|---|---|---|
| MX | Mexico | 13630 |
| BZ | Belize | 220 |
| GT | Guatemala | 2085 |
| HN | Honduras | 1251 |
| SV | El Salvador | 671 |
| NI | Nicaragua | 1395 |
| CR | Costa Rica | 410 |
| PA | Panama | 715 |
| AR | Argentina | 3156 |
| BO | Bolivia | 4722 |
| CL | Chile | 1017 |
| CO | Colombia | 3344 |
| EC | Ecuador | 2060 |
| PY | Paraguay | 932 |
| PE | Peru | 8562 |
| UY | Uruguay | 339 |
| CU | Cuba | 1300 |
| DO | Dominican Republic | 729 |

## Data-quality findings

- Missing or generic hostel name: **895**
- Hostel with blank city field: **9239**
- Hostel with invalid/missing coordinates: **0**
- Hostel outside approved countries: **0**
- Duplicate exact ID groups: **0**
- Repeated normalized name + country groups (not necessarily duplicates): **349**
- Same-name pairs within 100 metres (priority review candidates): **238**
- Duplicate normalized city name + country groups: **0**
- City records with invalid/missing coordinates: **0**
- City records outside approved countries: **0**

## Mexico City diagnosis

- Mexico City-like city index records: **1**
- Hostel records whose city field explicitly names Mexico City: **11**
| City name | Country | Lat | Lon |
|---|---|---|---|
| Mexico City | MX | 19.4326 | -99.1332 |

## Santa Marta diagnosis

- Santa Marta city index records in Colombia: **1**
- Hostel records whose city field explicitly says Santa Marta: **9**
| City name | Country | Lat | Lon |
|---|---|---|---|
| Santa Marta | CO | 11.2408 | -74.199 |

## Same-name hostel pairs within 100 metres

These are review candidates, not automatic deletions. Different properties can be close together and share generic names.
- **Casa Barby y Arturo** — CU; 0 m apart; node/5501816065 (22.2852001,-81.2096024) and node/5555227990 (22.2852001,-81.2096024)
- **Espacio Migrante** — MX; 0 m apart; node/13954289702 (32.5383389,-117.0341335) and node/13954302201 (32.5383389,-117.0341335)
- **The Point Hostel** — PE; 0 m apart; node/11984487603 (-12.120587,-77.0334246) and node/11986034817 (-12.120587,-77.0334245)
- **Mother Fanny Hostel** — EC; 0 m apart; node/13241921603 (-0.9570068,-90.9652042) and node/13242245502 (-0.9570068,-90.9652041)
- **Sun Island Hostel** — EC; 0 m apart; node/13242224507 (-0.9568011,-90.9672012) and node/13243139305 (-0.956801,-90.9672011)
- **El chileno** — CO; 0 m apart; node/4740488121 (8.6570168,-77.3660404) and way/451481536 (8.6570182,-77.3660422)
- **Hostal Nicarao** — NI; 1 m apart; node/5228355127 (12.4383971,-86.8757244) and way/416192150 (12.4383936,-86.87572)
- **Amanecer de la Bahia** — AR; 1 m apart; node/3185215352 (-54.8037459,-68.3084291) and node/12286243001 (-54.8037517,-68.3084364)
- **Hospedaje TOMMY** — PE; 1 m apart; node/12257198317 (-12.0703246,-75.2003653) and way/1324561890 (-12.0703254,-75.2003744)
- **Hostel Kathmandú** — AR; 1 m apart; node/5131939122 (-35.4678727,-69.5867908) and node/5131904232 (-35.4678762,-69.5868009)
- **Alojamiento Aidyn** — AR; 1 m apart; node/6949373841 (-40.8070151,-65.0878868) and way/819529773 (-40.8070242,-65.0878852)
- **Hostal La Buena Onda** — NI; 1 m apart; node/1884572322 (12.9288262,-85.9155026) and way/428808508 (12.9288349,-85.915498)
- **Caza azul** — MX; 1 m apart; node/6268928885 (20.5891019,-100.3940522) and node/6268928985 (20.5891013,-100.3940411)
- **Vintage Hill** — BO; 1 m apart; node/12350695559 (-18.1776756,-63.8780142) and way/672282117 (-18.1776651,-63.8780168)
- **Mia Hostel** — PE; 1 m apart; node/12925884582 (-9.0490666,-77.8124446) and node/13022797702 (-9.0490594,-77.8124348)
- **Atawkama** — PE; 1 m apart; node/4223817491 (-13.5167768,-71.985753) and node/7075559185 (-13.5167843,-71.985763)
- **Hospedaje la Madre** — CL; 2 m apart; node/13451268897 (-42.9187106,-72.7109696) and node/13610211301 (-42.9186966,-72.7109808)
- **Albergue Provincial N°5009** — AR; 2 m apart; node/2910161344 (-43.3182918,-65.0460409) and way/1441491235 (-43.318292,-65.0460131)
- **Hostal Don Moises** — BO; 2 m apart; node/12350695550 (-18.1756258,-63.8787225) and way/1334854720 (-18.1756421,-63.8787375)
- **Hostal Miguelina** — BO; 3 m apart; node/13384559134 (-21.4457918,-65.7166204) and node/13387532401 (-21.4457865,-65.7165963)
- **Hospedaje La Picada De Tranquilo** — CL; 3 m apart; node/6895838086 (-46.6251956,-72.6793935) and node/6953056122 (-46.6252121,-72.6794205)
- **Blue House Hostel** — EC; 3 m apart; node/4371978607 (-0.2041819,-78.490848) and way/424968337 (-0.2042047,-78.4908596)
- **Villa Mary** — CO; 3 m apart; node/4849658721 (11.2677813,-74.1892342) and way/626080390 (11.2677522,-74.1892368)
- **Hostel Buenos Aires** — AR; 4 m apart; node/5246363523 (-50.3413125,-72.2646353) and node/5267784521 (-50.3413449,-72.2646358)
- **Hostel Medellin Salsa** — CO; 4 m apart; node/6458640588 (6.2643854,-75.5647) and node/6580372985 (6.2643496,-75.5646898)
- **Granada Hostel** — CO; 4 m apart; node/7068031785 (4.5957515,-74.0714612) and node/7213081285 (4.5957731,-74.0714921)
- **Starfish of Paracas** — PE; 5 m apart; node/11842469369 (-13.8376681,-76.2480983) and node/11950861569 (-13.8376986,-76.248126)
- **Granada Hostel** — CO; 5 m apart; node/7098962585 (4.5958149,-74.0715348) and node/7180016888 (4.5958244,-74.0714942)
- **El Hostal Bed and Breakfast** — GT; 5 m apart; node/4940378621 (14.5556136,-90.7296891) and node/4940378622 (14.5555736,-90.7296751)
- **BoGo Hostel** — CO; 5 m apart; node/4121093589 (4.5926952,-74.071007) and node/4194537241 (4.592738,-74.070998)
- **Hostel Medellin Salsa** — CO; 5 m apart; node/6458640588 (6.2643854,-75.5647) and node/6514128585 (6.2644132,-75.5646643)
- **Unnamed hostel** — BO; 5 m apart; node/12350695569 (-18.1792534,-63.8769079) and way/1334918461 (-18.1792996,-63.8769025)
- **BEARDED MOUNTAINEER LODGE** — PE; 5 m apart; node/13228671701 (-13.47971,-71.7958708) and way/1549795508 (-13.4797125,-71.795822)
- **Casa Oro Eco Hostel** — NI; 5 m apart; node/11188998146 (11.2524236,-85.8712299) and way/417334376 (11.2524674,-85.8712489)
- **Nomad hostel** — CO; 5 m apart; node/6014419585 (6.2584846,-75.561618) and node/6415629185 (6.2585172,-75.5615815)
- **Unnamed hostel** — CL; 5 m apart; node/2321481555 (-41.8693438,-73.8283809) and way/150676610 (-41.8693643,-73.8283211)
- **Refugio La Roca** — CO; 6 m apart; node/4489444689 (6.7805842,-73.0863498) and node/12941679517 (6.7805727,-73.0863007)
- **Residencial Diar** — BO; 6 m apart; node/4991472828 (-18.9003965,-66.7738609) and node/5033274222 (-18.9004307,-66.7738207)
- **Granada Hostel** — CO; 6 m apart; node/7180016888 (4.5958244,-74.0714942) and node/7213081285 (4.5957731,-74.0714921)
- **Hospedaje Santa María** — PE; 6 m apart; node/8938840947 (-8.1245532,-79.017853) and node/8944100800 (-8.1246016,-79.0178758)
- **Unnamed hostel** — PE; 6 m apart; way/437806718 (-11.9861962,-77.0027937) and way/437806719 (-11.9862162,-77.0027429)
- **Casa de Nazareth - Obra Don Bosco** — AR; 6 m apart; way/741321089 (-40.8099654,-65.0944853) and way/741321091 (-40.8099345,-65.0945455)
- **GAVA hostel** — DO; 6 m apart; node/4114901553 (18.6855537,-68.4208871) and way/409588717 (18.6855031,-68.4208618)
- **Unnamed hostel** — PE; 6 m apart; way/435508107 (-11.8695729,-77.0734881) and way/435508108 (-11.8696131,-77.0734479)
- **Cielo Hostel** — CO; 6 m apart; node/5026850998 (11.2633313,-74.1901531) and way/514566460 (11.2633895,-74.1901547)
- **Raven La Paz** — BO; 7 m apart; node/13255863801 (-16.5105197,-68.1249963) and node/13358696501 (-16.5105518,-68.1250478)
- **Granada Hostel** — CO; 7 m apart; node/7098962585 (4.5958149,-74.0715348) and node/7213081285 (4.5957731,-74.0714921)
- **Sindicato de Chóferes de Camiones del Neuquén** — AR; 7 m apart; way/741321100 (-40.8119997,-65.0973752) and relation/10249798 (-40.8119797,-65.0974531)
- **Red House Hostel** — AR; 7 m apart; node/6977287085 (-50.3391845,-72.2777562) and node/7115314785 (-50.3391921,-72.2778549)
- **Saint Peters Llama Hostel** — BO; 7 m apart; node/11961744969 (-16.5021775,-68.1348255) and node/12175772601 (-16.5022256,-68.1347788)
- **Hostel Medellin Salsa** — CO; 8 m apart; node/6580372985 (6.2643496,-75.5646898) and node/6514128585 (6.2644132,-75.5646643)
- **La Casona Hostel** — CO; 8 m apart; node/4690435493 (6.2347353,-75.1623127) and node/5000956723 (6.2347536,-75.1623795)
- **Lo de Tote** — PY; 8 m apart; way/1347793897 (-23.4109875,-57.4496946) and way/1347793898 (-23.4110563,-57.4496782)
- **Mendihuaca Surf Camp** — CO; 9 m apart; node/9804132949 (11.2737207,-73.8565154) and node/11881331369 (11.2736618,-73.8565652)
- **Granada Hostel** — CO; 9 m apart; node/7068031785 (4.5957515,-74.0714612) and node/7180016888 (4.5958244,-74.0714942)
- **Lo de Tote** — PY; 9 m apart; way/1347793898 (-23.4110563,-57.4496782) and way/1347793899 (-23.4111393,-57.4496773)
- **Zuhause** — CL; 9 m apart; way/777411590 (-39.8282142,-73.2491258) and way/1118157183 (-39.8281315,-73.2491367)
- **Residencial de Turismo** — CL; 9 m apart; node/1579358907 (-33.9555232,-71.8294093) and way/1154655822 (-33.955558,-71.8295016)
- **Arcadia Hostel** — CO; 10 m apart; node/4470497391 (6.2117473,-75.563634) and node/5892947787 (6.2116735,-75.563683)
- **Artesanos y Turistas** — CO; 10 m apart; node/10695839905 (6.2309868,-75.1579771) and node/10695843505 (6.2308974,-75.1579643)
- **Unnamed hostel** — PE; 10 m apart; way/437508589 (-11.9527412,-76.9866572) and way/437508590 (-11.952683,-76.9867312)
- **Kantaya Hostel** — PE; 10 m apart; node/5844879886 (-15.8375813,-70.0293396) and node/6463116285 (-15.837545,-70.0292507)
- **Hostal Vista Verde** — CO; 10 m apart; node/11132633105 (11.1427732,-74.1047085) and node/11132633305 (11.1426937,-74.1047585)
- **Unnamed hostel** — PE; 10 m apart; way/437990706 (-12.1784878,-76.9639969) and way/437990708 (-12.1785779,-76.9640258)
- **Friendly House & Hostel 2** — EC; 11 m apart; node/12489871101 (-0.2208384,-78.504535) and way/1338911157 (-0.2208961,-78.5044583)
- **Granada Hostel** — CO; 11 m apart; node/7068031785 (4.5957515,-74.0714612) and node/7098962585 (4.5958149,-74.0715348)
- **Hostal California** — NI; 11 m apart; node/5425706021 (11.9778134,-86.0961848) and node/5538110723 (11.9779007,-86.0962368)
- **Red House Hostel** — AR; 11 m apart; node/7026377685 (-50.339181,-72.2780132) and node/7115314785 (-50.3391921,-72.2778549)
- **Casa Floresta** — NI; 11 m apart; node/10647262505 (11.254475,-85.8696957) and node/10656430105 (11.2543732,-85.8696927)
- **Unnamed hostel** — CU; 12 m apart; node/6941253073 (21.082029,-75.817523) and node/6941253074 (21.0819487,-75.8174492)
- **Cygnus Hostel** — CL; 12 m apart; node/11725895969 (-39.8235244,-73.240041) and node/11745795969 (-39.82363,-73.2400499)
- **Unnamed hostel** — PE; 12 m apart; way/438648584 (-12.0132933,-77.0049007) and way/438648585 (-12.0133116,-77.0047941)
- **Unnamed hostel** — CU; 12 m apart; node/6941253074 (21.0819487,-75.8174492) and node/6941253075 (21.0818963,-75.8175557)
- **Nomad hostel** — CO; 13 m apart; node/6014419585 (6.2584846,-75.561618) and node/6167357685 (6.2584036,-75.5615328)
- **Nomad Hostel** — CO; 14 m apart; node/6167357685 (6.2584036,-75.5615328) and node/6415629185 (6.2585172,-75.5615815)
- **Andrés Arnaud Jiménez** — MX; 14 m apart; way/1070268082 (19.0582155,-98.3087785) and way/1070268083 (19.0581024,-98.3087243)
- **Maktub** — AR; 14 m apart; node/9874383590 (-31.6525064,-64.4447898) and node/11126401205 (-31.65262,-64.4448512)
- **Lo de Tote** — PY; 14 m apart; way/954760763 (-23.4111007,-57.4498102) and way/1347793899 (-23.4111393,-57.4496773)
- **Lo de Tote** — PY; 14 m apart; way/954760763 (-23.4111007,-57.4498102) and way/1347793898 (-23.4110563,-57.4496782)
- **Hostel Patiperro** — CL; 14 m apart; node/4860376022 (-34.39527,-72.0247197) and way/655482865 (-34.3952201,-72.0248639)
- **EDA Inn** — PE; 15 m apart; node/5397475421 (-12.0849138,-77.0691618) and node/5465561322 (-12.0849797,-77.0692786)
- **Unnamed hostel** — CU; 15 m apart; node/6941253073 (21.082029,-75.817523) and node/6941253075 (21.0818963,-75.8175557)
- **Esthersita** — CL; 15 m apart; node/4539852827 (-18.4724145,-70.3040427) and node/4539852828 (-18.4723611,-70.3041768)
- **Casa Wayak** — MX; 16 m apart; node/5638047521 (21.1636646,-86.8333528) and node/12539280101 (21.1638,-86.833392)
- **Hostel Amancay** — AR; 16 m apart; node/4163318696 (-26.5954621,-65.9251982) and node/4164262020 (-26.5953226,-65.9251805)
- **Hostel Oasis** — CO; 16 m apart; node/6478899788 (11.5483982,-72.9077238) and node/6497742986 (11.5484598,-72.9075932)
- **Lo de Tote** — PY; 16 m apart; way/1347793891 (-23.4109568,-57.4498465) and way/1347793897 (-23.4109875,-57.4496946)
- **Unnamed hostel** — BO; 16 m apart; way/672265929 (-18.1790549,-63.8733448) and way/672265930 (-18.1791827,-63.8732759)
- **Zuhause** — CL; 16 m apart; way/588238004 (-39.8282157,-73.2489372) and way/777411590 (-39.8282142,-73.2491258)
- **Lo de Tote** — PY; 16 m apart; way/954760763 (-23.4111007,-57.4498102) and way/1347793891 (-23.4109568,-57.4498465)
- **America del sur** — AR; 16 m apart; node/5590195321 (-34.616443,-58.3759769) and node/2191861993 (-34.6164967,-58.3758093)
- **Casa Ismenia** — CU; 16 m apart; node/5473267124 (23.131279,-82.3644808) and node/5473276321 (23.1311308,-82.364474)
- **Unnamed hostel** — BO; 17 m apart; way/1006484080 (-15.1787435,-68.9949156) and way/1006484081 (-15.1786339,-68.9950252)
- **Casa Comunal Paquiestancia** — EC; 17 m apart; way/403743346 (0.0697517,-78.1109879) and way/1096193158 (0.0697363,-78.1111396)
- **Lo de Tote** — PY; 17 m apart; way/1347793897 (-23.4109875,-57.4496946) and way/1347793899 (-23.4111393,-57.4496773)
- **El Hostalito 14** — MX; 17 m apart; node/4644902690 (16.7373822,-92.6369281) and node/11290373269 (16.7374055,-92.6367703)
- **Unnamed hostel** — CU; 17 m apart; way/1195939666 (21.023556,-76.1114235) and way/1195939670 (21.023685,-76.1115136)
- **Unnamed hostel** — PE; 17 m apart; way/435508109 (-11.8697435,-77.0733178) and way/435508110 (-11.8698496,-77.073203)
- **Hotel C&C** — PY; 17 m apart; way/997530787 (-23.4088177,-57.4325925) and way/1360946198 (-23.4086771,-57.4326631)
- **Lo de Tote** — PY; 17 m apart; way/954760763 (-23.4111007,-57.4498102) and way/1347793897 (-23.4109875,-57.4496946)
- **Unnamed hostel** — PE; 18 m apart; way/439227480 (-12.0209342,-77.0966846) and way/439233233 (-12.0210771,-77.0967653)
- **Red House Hostel** — AR; 18 m apart; node/6977287085 (-50.3391845,-72.2777562) and node/7026377685 (-50.339181,-72.2780132)
- **Refugio Hoshken** — CL; 19 m apart; node/7058012450 (-51.7346426,-72.4950334) and node/7100583885 (-51.7346649,-72.4953008)
- **Unnamed hostel** — CU; 19 m apart; node/6941335625 (21.1144415,-75.8234052) and node/6941335626 (21.1144995,-75.8232363)
- **Volcano Hostal y Restaurante** — SV; 19 m apart; node/11166876705 (13.709414,-89.204916) and way/1205103435 (13.7093877,-89.2047444)
- **Estrella sin fronteras** — CO; 19 m apart; node/3603608447 (4.6367573,-75.5714646) and node/5977063486 (4.6366651,-75.5716075)
- **Hospedaje Laberinto** — CL; 19 m apart; node/4006701593 (-41.4744345,-72.9475429) and node/5152553824 (-41.4745396,-72.9477251)
- **Zuhause** — CL; 19 m apart; way/588238004 (-39.8282157,-73.2489372) and way/1118157183 (-39.8281315,-73.2491367)
- **Unnamed hostel** — PE; 20 m apart; way/435508108 (-11.8696131,-77.0734479) and way/435508109 (-11.8697435,-77.0733178)
- **Unnamed hostel** — CU; 20 m apart; way/1195939662 (21.0237472,-76.1113296) and way/1195939670 (21.023685,-76.1115136)
- **Unnamed hostel** — PE; 20 m apart; way/439193793 (-11.9924526,-77.1061818) and way/439193800 (-11.9922861,-77.1062601)
- **Unnamed hostel** — PE; 20 m apart; way/439193800 (-11.9922861,-77.1062601) and way/439193803 (-11.9921256,-77.1063507)
- **Lo de Tote** — PY; 20 m apart; way/1347793891 (-23.4109568,-57.4498465) and way/1347793898 (-23.4110563,-57.4496782)
- **Unnamed hostel** — BO; 21 m apart; way/672265929 (-18.1790549,-63.8733448) and way/1333489987 (-18.1788805,-63.8732784)
- **Hostel Nicole** — SV; 21 m apart; node/6198757588 (13.8798635,-89.5630735) and node/6219759485 (13.8799206,-89.5628913)
- **Tatai's** — CL; 21 m apart; node/4709192391 (-22.9084266,-68.1973835) and node/4814375521 (-22.9083726,-68.1971887)
- **Unnamed hostel** — BO; 21 m apart; node/12350695562 (-18.1788962,-63.8780573) and node/12350695564 (-18.1790766,-63.8779907)
- **La perla del centro** — CU; 21 m apart; node/6293844685 (21.9278525,-79.4440331) and node/6317265285 (21.9277128,-79.4438895)
- **Habana 612** — CU; 22 m apart; node/5233648725 (23.13578,-82.352478) and node/6893327692 (23.135584,-82.352495)
- **Kausay Punku** — PE; 23 m apart; way/530192730 (-13.4062083,-71.8313184) and way/530192735 (-13.4062335,-71.8315267)
- **Hostel Home** — MX; 23 m apart; node/2111435918 (19.4175726,-99.1668247) and node/13097372611 (19.417777,-99.1668399)
- **Motel El Rey Leon** — CO; 23 m apart; node/6945067077 (8.2763159,-73.3711934) and node/6945067079 (8.2763517,-73.3709884)
- **Unnamed hostel** — AR; 23 m apart; way/907816248 (-34.1860765,-58.250175) and way/907819938 (-34.1859599,-58.2499692)
- **Casa Bambutan** — MX; 23 m apart; node/6422011286 (17.4922673,-91.9823228) and node/6484106787 (17.4924214,-91.9824671)
- **Parwa Hostel** — PE; 23 m apart; node/4386327990 (-13.5211473,-71.9857032) and node/4413745696 (-13.5213257,-71.9855927)
- **Unnamed hostel** — PE; 23 m apart; way/435698133 (-11.9416226,-77.0650395) and way/435698969 (-11.9415851,-77.0648287)
- **Unnamed hostel** — CU; 23 m apart; way/1195939662 (21.0237472,-76.1113296) and way/1195939666 (21.023556,-76.1114235)
- **Hostel Oasis** — CO; 24 m apart; node/6476655186 (11.54819,-72.9076858) and node/6478899788 (11.5483982,-72.9077238)
- **Cabinas Guarana** — CR; 24 m apart; node/7003228785 (9.6556024,-82.7538449) and node/7003228885 (9.655749,-82.7540007)
- **Hostal Mia** — PE; 24 m apart; way/514592377 (-14.0423405,-75.7099948) and way/515637168 (-14.0422441,-75.7097983)
- **Hostal Paradise** — EC; 24 m apart; way/429382828 (-0.2894182,-78.5371776) and way/429382829 (-0.28922,-78.5372736)
- **Mahalo** — CO; 25 m apart; node/6260704985 (4.6387334,-75.5677567) and node/6993880486 (4.6386476,-75.5675502)
- **Albergue Chicas** — CU; 25 m apart; way/620769879 (23.0515267,-81.6516953) and way/620769881 (23.0514117,-81.6514854)
- **Unnamed hostel** — PE; 26 m apart; way/439227480 (-12.0209342,-77.0966846) and way/439227481 (-12.0207448,-77.0965463)
- **Unnamed hostel** — NI; 26 m apart; way/415551091 (11.255598,-85.8703242) and way/416172187 (11.255424,-85.8701619)
- **Unnamed hostel** — PE; 27 m apart; way/435508107 (-11.8695729,-77.0734881) and way/435508109 (-11.8697435,-77.0733178)
- **Lo de Tote** — PY; 27 m apart; way/1347793891 (-23.4109568,-57.4498465) and way/1347793899 (-23.4111393,-57.4496773)
- **Unnamed hostel** — CU; 29 m apart; node/6941335625 (21.1144415,-75.8234052) and node/6941335627 (21.1146654,-75.8235474)
- **Sunset** — PE; 29 m apart; node/11742189569 (-12.022662,-77.1033057) and node/11742284369 (-12.0228202,-77.1035172)
- **Unnamed hostel** — CU; 29 m apart; way/1195939658 (21.0239459,-76.1115142) and way/1195939670 (21.023685,-76.1115136)
- **Unnamed hostel** — EC; 29 m apart; way/1327346533 (-1.8151453,-80.7568024) and way/1327346534 (-1.8153732,-80.75693)
- **Unnamed hostel** — CU; 29 m apart; way/1195939658 (21.0239459,-76.1115142) and way/1195939662 (21.0237472,-76.1113296)
- **Unnamed hostel** — CU; 30 m apart; node/6941335627 (21.1146654,-75.8235474) and node/6941335628 (21.114769,-75.8232807)
- **Unnamed hostel** — CU; 30 m apart; node/6941335626 (21.1144995,-75.8232363) and node/6941335628 (21.114769,-75.8232807)
- **Unnamed hostel** — PE; 30 m apart; way/437378484 (-12.0264957,-77.0102505) and way/437462077 (-12.0262413,-77.0101488)
- **Alojamiento** — BO; 31 m apart; node/8929390629 (-16.490362,-68.2085169) and node/8929403928 (-16.4902661,-68.2082423)
- **Hostel Oasis** — CO; 32 m apart; node/6476655186 (11.54819,-72.9076858) and node/6497742986 (11.5484598,-72.9075932)
- **Unnamed hostel** — PE; 32 m apart; way/438009535 (-12.0693044,-76.9423166) and way/438009536 (-12.0690442,-76.9424429)
- **Unnamed hostel** — PE; 33 m apart; way/439227115 (-12.0354588,-77.0968849) and way/439227118 (-12.0352063,-77.0967337)
- **Casa Rico** — CR; 33 m apart; node/13125033065 (9.6563238,-85.0936723) and way/1427708815 (9.6565886,-85.0938141)
- **Albergue o residencia estudiantil** — AR; 33 m apart; way/508297315 (-25.6470974,-60.9262176) and way/508297316 (-25.6468061,-60.9262997)
- **Albergue o residencia estudiantil** — AR; 33 m apart; way/508297314 (-25.6469071,-60.9259593) and way/508297315 (-25.6470974,-60.9262176)
- **Unnamed hostel** — BO; 34 m apart; way/672265930 (-18.1791827,-63.8732759) and way/1333489987 (-18.1788805,-63.8732784)
- **Hostel Siriri** — PA; 34 m apart; node/4731186122 (8.9801273,-79.5208916) and way/383679722 (8.9803779,-79.5210718)
- **Unnamed hostel** — PE; 35 m apart; way/438905608 (-11.9745004,-77.0767964) and way/438905610 (-11.9741955,-77.0767326)
- **Hostal Suizo** — CO; 36 m apart; way/871741168 (4.9123723,-74.4060283) and way/871741169 (4.9121876,-74.4057669)
- **Albergue o residencia estudiantil** — AR; 36 m apart; way/508297314 (-25.6469071,-60.9259593) and way/508297316 (-25.6468061,-60.9262997)
- **Unnamed hostel** — PE; 37 m apart; way/437498044 (-12.172804,-76.9620745) and way/437498047 (-12.1724789,-76.9619962)
- **Unnamed hostel** — CU; 37 m apart; node/6941335626 (21.1144995,-75.8232363) and node/6941335627 (21.1146654,-75.8235474)
- **Unnamed hostel** — PE; 37 m apart; way/435508108 (-11.8696131,-77.0734479) and way/435508110 (-11.8698496,-77.073203)
- **Unnamed hostel** — CU; 38 m apart; way/802075159 (23.1150498,-82.3853601) and way/802075219 (23.1149831,-82.3849986)
- **Unnamed hostel** — PE; 38 m apart; way/435829680 (-11.9389838,-77.0581533) and way/435829682 (-11.9386924,-77.0579743)
- **Unnamed hostel** — CU; 39 m apart; node/6941335625 (21.1144415,-75.8234052) and node/6941335628 (21.114769,-75.8232807)
- **Albergue Chicas** — CU; 39 m apart; way/620769881 (23.0514117,-81.6514854) and way/620769882 (23.0511173,-81.6517)
- **Unnamed hostel** — CU; 40 m apart; node/6941253074 (21.0819487,-75.8174492) and node/6941253076 (21.0817238,-75.817148)
- **El Nomada Hostel** — CO; 41 m apart; node/7024420390 (11.2535269,-73.5573104) and node/9456136117 (11.2533065,-73.5570142)
- **Hospedaje** — CL; 41 m apart; node/6320261345 (-37.7936812,-72.704993) and node/6320261349 (-37.7939298,-72.7046543)
- **Unnamed hostel** — PE; 41 m apart; way/439193793 (-11.9924526,-77.1061818) and way/439193803 (-11.9921256,-77.1063507)
- **Unnamed hostel** — PE; 41 m apart; way/439240340 (-12.0183339,-77.0954573) and way/439240342 (-12.018596,-77.095724)
- **Complejo Antu** — CL; 42 m apart; node/1621836530 (-36.7397786,-72.497014) and way/1458642441 (-36.7399987,-72.4966376)
- **Unnamed hostel** — PE; 42 m apart; way/521631385 (-11.1070093,-77.5966322) and way/521631387 (-11.1072552,-77.5969231)
- **El telefono** — GT; 42 m apart; node/5877249685 (14.9430117,-91.1136926) and node/6501157585 (14.9432222,-91.1140205)
- **Unnamed hostel** — PE; 42 m apart; node/9630543017 (-10.3592474,-77.0018122) and node/9960562119 (-10.3589337,-77.0015927)
- **Unnamed hostel** — PE; 44 m apart; way/435508107 (-11.8695729,-77.0734881) and way/435508110 (-11.8698496,-77.073203)
- **Unnamed hostel** — PE; 44 m apart; way/439227481 (-12.0207448,-77.0965463) and way/439233233 (-12.0210771,-77.0967653)
- **Hospedaje Ayllu** — PE; 44 m apart; node/4173425090 (-13.2994003,-72.1165945) and node/9278505051 (-13.2994984,-72.1161976)
- **Unnamed hostel** — CU; 44 m apart; way/1195939658 (21.0239459,-76.1115142) and way/1195939666 (21.023556,-76.1114235)
- **Albergue Chicas** — CU; 46 m apart; way/620769879 (23.0515267,-81.6516953) and way/620769882 (23.0511173,-81.6517)
- **Unnamed hostel** — CU; 46 m apart; node/6941253075 (21.0818963,-75.8175557) and node/6941253076 (21.0817238,-75.817148)
- **Unnamed hostel** — PE; 47 m apart; way/437806721 (-11.9873221,-76.9999485) and way/437997003 (-11.9869473,-76.9997422)
- **Hospedaje Alex** — PE; 48 m apart; node/6593462236 (-4.6398198,-79.7151314) and node/6593462440 (-4.6393971,-79.7150686)
- **Unnamed hostel** — PE; 48 m apart; way/437355980 (-12.154155,-76.9691554) and way/437355981 (-12.1543092,-76.9695631)
- **Unnamed hostel** — CU; 48 m apart; node/6941335624 (21.1147151,-75.8240053) and node/6941335627 (21.1146654,-75.8235474)
- **Unnamed hostel** — CO; 48 m apart; node/1561902907 (3.3434271,-76.4905179) and node/1561902911 (3.3437805,-76.4902711)
- **Hostería La Finca** — CL; 48 m apart; way/823270295 (-34.2644703,-71.4059585) and way/823270296 (-34.2641231,-71.4062688)
- **Unnamed hostel** — BO; 49 m apart; way/673835303 (-18.1804073,-63.8823702) and way/673835304 (-18.1804261,-63.8819072)
- **Las cruces** — CL; 50 m apart; node/4539852818 (-18.4732381,-70.3024883) and node/4539852819 (-18.4732566,-70.3029624)
- **Unnamed hostel** — CU; 52 m apart; node/6941253073 (21.082029,-75.817523) and node/6941253076 (21.0817238,-75.817148)
- **Unnamed hostel** — PE; 52 m apart; way/437634872 (-12.0715368,-77.0284154) and way/437636426 (-12.0710756,-77.0284779)
- **Unnamed hostel** — PE; 52 m apart; node/4995716321 (-13.582838,-71.8086865) and node/9423438515 (-13.5828579,-71.8091647)
- **Rancho Estero** — PA; 54 m apart; node/1569950499 (7.627888,-81.2479681) and node/1866784324 (7.62769,-81.2484122)
- **Unnamed hostel** — PE; 54 m apart; node/4355935389 (-11.9555903,-76.9934144) and way/437784485 (-11.9556366,-76.9929159)
- **wild rover** — PE; 56 m apart; node/4460541589 (-13.5141061,-71.9848015) and node/4524885807 (-13.5144168,-71.9852113)
- **Unnamed hostel** — CO; 57 m apart; node/1561903004 (3.3398497,-76.4941978) and node/1561903034 (3.3393571,-76.4940691)
- **Unnamed hostel** — PE; 57 m apart; way/439231145 (-12.0184634,-77.0949506) and way/439240340 (-12.0183339,-77.0954573)
- **Hospedaje Mayo** — PE; 57 m apart; node/4641897789 (-14.0886442,-75.7633565) and way/389395444 (-14.0886599,-75.7628277)
- **Unnamed hostel** — PE; 58 m apart; way/520368167 (-11.4943688,-77.2171398) and way/520368168 (-11.4940992,-77.2175937)
- **Unnamed hostel** — PE; 58 m apart; way/438011383 (-12.1757014,-76.9637236) and way/438032481 (-12.1751804,-76.9637694)
- **Hostel Orquideas** — MX; 59 m apart; node/4283257092 (21.1602434,-86.8286251) and node/4314960491 (21.1598575,-86.8282321)
- **Hospedaje** — HN; 59 m apart; node/4731405721 (13.8627952,-86.5571231) and node/4731405821 (13.8630035,-86.5576283)
- **Unnamed hostel** — PE; 60 m apart; way/439039656 (-11.9875959,-77.1029468) and way/439039657 (-11.9872333,-77.1025425)
- **Unnamed hostel** — PE; 60 m apart; way/440118700 (-12.0008504,-76.8383541) and way/440225238 (-12.0007306,-76.8378191)
- **Unnamed hostel** — CU; 60 m apart; node/4682606696 (20.3470294,-74.4960643) and node/5086022821 (20.347411,-74.4956518)
- **Unnamed hostel** — EC; 62 m apart; way/1327346535 (-1.8160446,-80.756664) and way/1327346536 (-1.8159249,-80.7572079)
- **Hospedaje Familiar Carmen Alto** — PE; 62 m apart; node/4117336393 (-13.5147984,-71.9751082) and node/12324268633 (-13.5143922,-71.9755001)
- **Unnamed hostel** — BO; 63 m apart; way/672270182 (-18.1788556,-63.8744215) and way/1333489982 (-18.1784849,-63.8739723)
- **La Tortuga Hostel** — CO; 63 m apart; node/2289404624 (11.2704949,-74.1897072) and node/6518647187 (11.2702821,-74.1891712)
- **hostel  del glaciar pioneros** — AR; 63 m apart; node/11462858869 (-50.3424132,-72.2534995) and node/5331619689 (-50.3429818,-72.2534879)
- **Casa de la Trinidad** — CU; 65 m apart; node/5228715363 (21.804701,-79.9878188) and node/6865236485 (21.8042291,-79.9874417)
- **Unnamed hostel** — PE; 65 m apart; node/4868562822 (-9.1304883,-78.5177904) and way/519411910 (-9.1309145,-78.5182006)
- **Unnamed hostel** — PE; 66 m apart; way/435196383 (-12.0850882,-77.0832993) and way/435196388 (-12.0856407,-77.0835097)
- **Hostel Naylamp** — PE; 66 m apart; node/1882932785 (-8.0731537,-79.1187039) and node/1882932786 (-8.0732146,-79.1192974)
- **Unnamed hostel** — CO; 67 m apart; node/1561902902 (3.3440055,-76.490829) and node/1561902911 (3.3437805,-76.4902711)
- **Unnamed hostel** — PE; 68 m apart; way/439224097 (-12.0191862,-77.0975367) and way/439224099 (-12.0186245,-77.0977894)
- **Unnamed hostel** — EC; 69 m apart; way/1327346534 (-1.8153732,-80.75693) and way/1327346536 (-1.8159249,-80.7572079)
- **Unnamed hostel** — CU; 69 m apart; node/6941335624 (21.1147151,-75.8240053) and node/6941335625 (21.1144415,-75.8234052)
- **Unnamed hostel** — CO; 73 m apart; node/1561902902 (3.3440055,-76.490829) and node/1561902907 (3.3434271,-76.4905179)
- **Unnamed hostel** — CU; 74 m apart; way/1169194172 (22.4263452,-79.9243359) and way/1231587343 (22.4268628,-79.9238911)
- **Unnamed hostel** — BO; 74 m apart; way/672282102 (-18.1793355,-63.8816288) and way/1335038725 (-18.1794632,-63.880942)
- **Unnamed hostel** — PE; 74 m apart; way/791944733 (-13.3240135,-72.053973) and way/791944749 (-13.3245465,-72.0543851)
- **Little Morgans** — NI; 75 m apart; node/5593554021 (11.4909098,-85.535766) and relation/20616154 (11.4902343,-85.5357254)
- **Unnamed hostel** — CU; 75 m apart; node/6941335624 (21.1147151,-75.8240053) and node/6941335628 (21.114769,-75.8232807)
- **Casa Blanca** — BO; 75 m apart; node/827515379 (-19.5908516,-65.753696) and node/3720610608 (-19.5905182,-65.7530687)
- **Unnamed hostel** — PE; 77 m apart; node/4356804908 (-12.0632302,-77.0277315) and node/4356806821 (-12.0639146,-77.0276421)
- **Unnamed hostel** — PE; 78 m apart; node/10262569010 (-12.137001,-77.0250826) and node/10262583009 (-12.1376566,-77.0253294)
- **Unnamed hostel** — EC; 80 m apart; way/1327346534 (-1.8153732,-80.75693) and way/1327346535 (-1.8160446,-80.756664)
- **Cabinas El Pueblo** — CR; 80 m apart; way/1036440077 (10.3170966,-84.8256413) and way/1036703507 (10.3174349,-84.8249926)
- **Unnamed hostel** — CU; 83 m apart; node/6941335624 (21.1147151,-75.8240053) and node/6941335626 (21.1144995,-75.8232363)
- **Unnamed hostel** — PE; 85 m apart; way/437378483 (-12.027175,-77.010604) and way/437378484 (-12.0264957,-77.0102505)
- **Panela Hostel** — CO; 85 m apart; node/6443929385 (6.2097653,-75.5715898) and node/6443929386 (6.2103946,-75.5720324)
- **Unnamed hostel** — PE; 85 m apart; way/439231145 (-12.0184634,-77.0949506) and way/439240342 (-12.018596,-77.095724)
- **Unnamed hostel** — BO; 85 m apart; way/1333489982 (-18.1784849,-63.8739723) and way/1333489987 (-18.1788805,-63.8732784)
- **Unnamed hostel** — PE; 90 m apart; way/791944733 (-13.3240135,-72.053973) and way/791944738 (-13.3233632,-72.0544617)
- **Unnamed hostel** — BO; 92 m apart; way/672265929 (-18.1790549,-63.8733448) and way/1333489982 (-18.1784849,-63.8739723)
- **Hospedaje EICTV** — CU; 92 m apart; way/326846246 (22.9161434,-82.5427186) and way/326846247 (22.9159645,-82.5435998)
- **Alojamiento** — BO; 96 m apart; node/5018752730 (-16.4894794,-68.2086099) and node/8929403928 (-16.4902661,-68.2082423)
- **Unnamed hostel** — EC; 98 m apart; way/1327346533 (-1.8151453,-80.7568024) and way/1327346536 (-1.8159249,-80.7572079)
- **Alojamiento** — BO; 99 m apart; node/5018752730 (-16.4894794,-68.2086099) and node/8929390629 (-16.490362,-68.2085169)

## Duplicate city-index review candidates

- None found.
