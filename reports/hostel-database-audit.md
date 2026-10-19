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
- Same normalized name + city + country groups (review only): **290**
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

## Same-name hostel review candidates

- **Unnamed hostel** — (city missing), PE: 396 records; IDs: node/1013453527, node/1793760305, node/1794633105, node/1794633116, node/1794633124, node/1810079578, node/1881761107, node/2616243222, node/3085228496, node/3265079411
- **Unnamed hostel** — (city missing), CU: 64 records; IDs: node/2297535220, node/3653598355, node/4317172939, node/4412163290, node/4607062289, node/4682606696, node/4682629294, node/4682629497, node/4682629499, node/4716825290
- **Unnamed hostel** — (city missing), CO: 61 records; IDs: node/481018958, node/1469608885, node/1469609363, node/1561902902, node/1561902907, node/1561902911, node/1561902917, node/1561903004, node/1561903016, node/1561903017
- **Unnamed hostel** — (city missing), EC: 58 records; IDs: node/2673430712, node/4207058491, node/4241809439, node/4257794908, node/4257834564, node/4423522989, node/4484724290, node/4487971689, node/4580151493, node/4687994589
- **Unnamed hostel** — (city missing), AR: 51 records; IDs: node/1997549419, node/2106417569, node/2189138211, node/2294203812, node/2658195228, node/2688540949, node/2757601362, node/3327899270, node/3530758872, node/3544616181
- **Unnamed hostel** — (city missing), CL: 50 records; IDs: node/1534156016, node/2034550043, node/2162837323, node/2190826125, node/2321481555, node/4234567600, node/4621181898, node/4804534672, node/5026402421, node/5094663129
- **Unnamed hostel** — (city missing), MX: 48 records; IDs: node/890960598, node/1737895067, node/1873781105, node/1873781181, node/1873830725, node/1873895296, node/2225783939, node/2393440139, node/2718228177, node/4729203389
- **Unnamed hostel** — (city missing), BO: 43 records; IDs: node/1180831952, node/4424155341, node/4556091127, node/4557854694, node/4578683390, node/4681677794, node/4730898422, node/4846273521, node/5076071153, node/5077459525
- **Alojamiento** — (city missing), BO: 14 records; IDs: node/4351887989, node/4986031721, node/5018741844, node/5018752730, node/5029651821, node/5029651925, node/5034912621, node/5037300024, node/8929390629, node/8929403928
- **Unnamed hostel** — (city missing), GT: 13 records; IDs: node/1981983762, node/2806217399, node/4577327242, node/4595557093, node/4933370221, node/4941288321, node/11984287069, node/12398597905, node/12398598002, node/12405917801
- **Hospedaje** — (city missing), CL: 11 records; IDs: node/1540341439, node/4148106189, node/4466543189, node/5086938023, node/5095203522, node/6317777325, node/6318613897, node/6320261345, node/6320261349, node/6364762888
- **Unnamed hostel** — (city missing), PA: 11 records; IDs: node/1866784327, node/1866784328, node/1866784337, node/1866784375, node/2297143558, node/10870728406, node/12418242601, node/12437643802, node/12449724001, way/384908002
- **Hostal** — (city missing), CL: 10 records; IDs: node/1319674873, node/1520494615, node/2070820183, node/2297313264, node/5275853821, node/5373849626, node/5421511323, node/5928715002, way/637692364, way/639245457
- **Unnamed hostel** — (city missing), CR: 10 records; IDs: node/1363236666, node/1866856529, node/10181250317, node/12533042801, way/380130228, way/394687335, way/562038012, way/1004818742, way/1027581692, way/1221032409
- **Hostal** — Quito, EC: 9 records; IDs: way/422690661, way/425403841, way/428046383, way/428095499, way/428319764, way/428512207, way/429337997, way/429362754, way/429367182
- **Albergue Municipal** — (city missing), AR: 8 records; IDs: node/2653913243, node/4354914291, node/4462233652, node/12338379531, way/325754502, way/609065259, way/863104809, way/1337384289
- **Hostal** — (city missing), EC: 8 records; IDs: node/3758123569, node/3954231297, node/3966739410, node/4070281389, node/4073484664, node/13054781702, way/423451416, way/588501561
- **Unnamed hostel** — (city missing), NI: 7 records; IDs: node/4212902498, node/4234939689, node/4774864167, node/4792462522, node/6394506485, node/13676530101, way/417968987
- **Unnamed hostel** — (city missing), UY: 7 records; IDs: node/3861731136, node/4156353223, node/5457603543, node/6868795185, node/7090513685, node/7110186385, way/325932242
- **Hospedaje** — (city missing), CO: 6 records; IDs: node/796646972, node/5460947921, node/5740162693, node/5805024919, node/6816442286, way/587027515
- **Hostal** — (city missing), CO: 6 records; IDs: node/4463475875, node/4823678521, node/6098431857, node/6098431858, node/6098453967, node/9455562418
- **Hostal Cochera** — (city missing), PE: 5 records; IDs: way/437513359, way/437873148, way/437881580, way/516486892, way/522620092
- **Hostel** — (city missing), AR: 5 records; IDs: node/5095293013, node/5855680119, node/6975309185, node/8334239019, node/12740665440
- **Lo de Tote** — (city missing), PY: 5 records; IDs: way/954760763, way/1347793891, way/1347793897, way/1347793898, way/1347793899
- **Unnamed hostel** — Lima, PE: 5 records; IDs: node/4356804908, node/4356806821, node/4362220514, node/4367935643, node/4367978693
- **El Mirador** — (city missing), PE: 4 records; IDs: node/4622332530, node/5300991423, node/6593462597, way/518442654
- **Granada Hostel** — (city missing), CO: 4 records; IDs: node/7068031785, node/7098962585, node/7180016888, node/7213081285
- **Hostal** — (city missing), CU: 4 records; IDs: node/5061164621, node/5209045822, node/11128539706, node/14244527570
- **Hostal Bolognesi** — (city missing), PE: 4 records; IDs: node/5010553124, node/5082725321, way/513711745, way/519449115
- **Hostal Leo** — (city missing), PE: 4 records; IDs: node/1003912046, node/4858685026, node/6357355285, way/439027744
- **Unnamed hostel** — (city missing), PY: 4 records; IDs: node/4994889225, node/7578381286, node/8569596839, node/10679730106
- **Unnamed hostel** — (city missing), SV: 4 records; IDs: node/3814809443, node/8305712118, node/10892437209, node/13609522701
- **Albergue Chicas** — (city missing), CU: 3 records; IDs: way/620769879, way/620769881, way/620769882
- **Albergue o residencia estudiantil** — Miraflores Chaco, AR: 3 records; IDs: way/508297314, way/508297315, way/508297316
- **Cabañas** — (city missing), CL: 3 records; IDs: node/2069809987, node/3897529579, node/5441288224
- **El Dorado** — (city missing), CO: 3 records; IDs: node/4314435696, node/5302685722, way/163861892
- **El Encanto** — (city missing), PE: 3 records; IDs: way/437997118, way/520612480, way/523824399
- **hospedaje** — (city missing), AR: 3 records; IDs: node/11035928705, node/11384808920, node/12608595150
- **Hospedaje** — (city missing), NI: 3 records; IDs: node/4742415324, node/5331684846, way/556838568
- **Hospedaje Oasis** — (city missing), PE: 3 records; IDs: node/4306748891, node/9993409224, way/437326049
- **Hospedaje Santa Rosa** — (city missing), PE: 3 records; IDs: node/4267912089, node/4960723321, node/4988884025
- **Hostal** — (city missing), AR: 3 records; IDs: node/1922041993, node/5129702722, node/6115468330
- **Hostal** — (city missing), NI: 3 records; IDs: node/6273326985, way/417907707, way/417929783
- **Hostal Buena Vista** — (city missing), CU: 3 records; IDs: node/2053152173, node/4900827421, node/7179781186
- **Hostal Copacabana** — (city missing), PE: 3 records; IDs: node/4998735429, node/12533854801, way/520369145
- **Hostal El Tambo** — (city missing), PE: 3 records; IDs: node/1257133032, node/4987259823, node/13230735102
- **Hostal Paraiso** — (city missing), PE: 3 records; IDs: node/4353165831, node/4998735421, way/512674847
- **Hostal Plaza** — (city missing), PE: 3 records; IDs: node/1872788444, node/1881741390, node/5064285789
- **Hostal San Francisco** — (city missing), PE: 3 records; IDs: node/1902254604, node/4856285135, node/6743936087
- **Hostel Medellin Salsa** — (city missing), CO: 3 records; IDs: node/6458640588, node/6580372985, node/6514128585
- **Hostel Oasis** — (city missing), CO: 3 records; IDs: node/6476655186, node/6478899788, node/6497742986
- **Hs** — (city missing), PE: 3 records; IDs: way/414733758, way/439031560, way/516198592
- **La Casona** — (city missing), AR: 3 records; IDs: node/3167052071, node/5008454127, node/13840860972
- **Nomad hostel** — (city missing), CO: 3 records; IDs: node/6014419585, node/6167357685, node/6415629185
- **Red House Hostel** — (city missing), AR: 3 records; IDs: node/6977287085, node/7026377685, node/7115314785
- **Unnamed hostel** — San Juan Del Sur, NI: 3 records; IDs: way/415551091, way/415573119, way/416172187
- **Zuhause** — Valdivia, CL: 3 records; IDs: way/588238004, way/777411590, way/1118157183
- **Agartha Hostel and Camping** — (city missing), PA: 2 records; IDs: node/10226196317, node/10805210470
- **Air BnB** — (city missing), MX: 2 records; IDs: node/4598594390, node/5937673185
- **Airbnb** — (city missing), MX: 2 records; IDs: node/5203300421, node/6958218993
- **Albergue juvenil** — (city missing), PE: 2 records; IDs: node/13700173101, node/13700173805
- **Albergue Provincial N°5009** — Playa Unión, AR: 2 records; IDs: node/2910161344, way/1441491235
- **Alojamiento Aidyn** — Las Grutas, AR: 2 records; IDs: node/6949373841, way/819529773
- **Aluna** — (city missing), CO: 2 records; IDs: node/3183443160, node/4740801022
- **Amanecer de la Bahia** — (city missing), AR: 2 records; IDs: node/3185215352, node/12286243001
- **America del sur** — (city missing), AR: 2 records; IDs: node/5590195321, way/789629546
- **Andino** — (city missing), AR: 2 records; IDs: node/4179370242, node/12732037711
- **Andrés Arnaud Jiménez** — (city missing), MX: 2 records; IDs: way/1070268082, way/1070268083
- **Apu Wasi** — (city missing), PE: 2 records; IDs: node/2753143021, node/9829265122
- **Arcadia Hostel** — (city missing), CO: 2 records; IDs: node/4470497391, node/5892947787
- **Artesanos y Turistas** — (city missing), CO: 2 records; IDs: node/10695839905, node/10695843505
- **Atawkama** — (city missing), PE: 2 records; IDs: node/4223817491, node/7075559185
- **Atlantic** — (city missing), PE: 2 records; IDs: node/5004002868, node/5004003048
- **Ayahuasca casa Artistica** — (city missing), CO: 2 records; IDs: node/10730197905, node/12421740801
- **Backpackers Hostel** — (city missing), AR: 2 records; IDs: node/3128137637, node/4115687989
- **BEARDED MOUNTAINEER LODGE** — san salvador, PE: 2 records; IDs: node/13228671701, way/1549795508
- **belize city** — (city missing), BZ: 2 records; IDs: node/11133601206, node/11133601405
- **Blanco** — (city missing), NI: 2 records; IDs: node/4272705089, node/4842181123
- **BoGo Hostel** — (city missing), CO: 2 records; IDs: node/4121093589, node/4194537241
- **Buena Vista** — (city missing), CL: 2 records; IDs: node/2320862707, node/5331156341
- **Cabinas El Pueblo** — (city missing), CR: 2 records; IDs: way/1036440077, way/1036703507
- **Casa** — (city missing), EC: 2 records; IDs: node/5632918521, node/11954587469
- **Casa Almarita** — (city missing), CO: 2 records; IDs: node/10571309911, node/12187354901
- **Casa Bambutan** — (city missing), MX: 2 records; IDs: node/6422011286, node/6484106787
- **Casa Barby y Arturo** — (city missing), CU: 2 records; IDs: node/5501816065, node/5555227990
- **Casa Blanca** — (city missing), BO: 2 records; IDs: node/827515379, node/4119564902
- **Casa Blanca** — (city missing), CO: 2 records; IDs: node/1601814971, node/5853853062
- **Casa Blanca** — (city missing), CU: 2 records; IDs: node/4715447091, node/9767489837
- **Casa Buena Vista** — (city missing), CU: 2 records; IDs: node/4721964393, node/5035384721
- **Casa Caracol** — (city missing), MX: 2 records; IDs: node/4556436743, node/4932944922
- **Casa China** — (city missing), MX: 2 records; IDs: node/4740838623, node/5422546121
- **Casa Comunal Paquiestancia** — (city missing), EC: 2 records; IDs: way/403743346, way/1096193158
- **Casa comunitaria** — (city missing), EC: 2 records; IDs: way/612096980, way/613851671
- **Casa corazon** — (city missing), MX: 2 records; IDs: node/8389087818, node/9518386377
- **Casa de huespedes** — (city missing), MX: 2 records; IDs: node/6515674885, node/10538261812
- **Casa de Nazareth - Obra Don Bosco** — Las Grutas, AR: 2 records; IDs: way/741321089, way/741321091
- **Casa de niños sin acompañamiento familiar** — (city missing), CU: 2 records; IDs: node/13929284701, node/13929285101
- **Casa Floresta** — (city missing), NI: 2 records; IDs: node/10647262505, node/10656430105
- **Casa Ismenia** — (city missing), CU: 2 records; IDs: node/5473267124, node/5473276321
- **Casa La Lupe** — (city missing), CU: 2 records; IDs: node/5623399829, node/6426055107

## Duplicate city-index review candidates

- None found.
