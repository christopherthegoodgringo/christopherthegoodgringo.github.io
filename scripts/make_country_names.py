#!/usr/bin/env python3
"""Gives every country team member (AI persona) a fictional name that is common in their country and
matches their cartoon portrait (scripts/make_country_avatars.py draws long hair for the women).
Writes i18n-neutral data the team page reads: team/country-names.js

Run from the repository root:  python3 scripts/make_country_names.py"""
import hashlib, json, os

COUNTRIES = ['Argentina', 'Belize', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Dominican Republic', 'Ecuador',
             'El Salvador', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'Uruguay']
ROLES = ['Marketing', 'Social Media', 'Content Creator', 'Web Design', 'Local Research', 'Partnerships']

# (women's first names, men's first names, surnames), all very common in that country.
NAMES = {
 'Argentina': (['Martina', 'Lucía', 'Florencia', 'Agustina', 'Camila', 'Julieta'], ['Matías', 'Federico', 'Joaquín', 'Nicolás', 'Facundo', 'Tomás'], ['González', 'Fernández', 'López', 'Romero', 'Sosa', 'Álvarez', 'Benítez', 'Acosta']),
 'Belize': (['Keisha', 'Shanice', 'Maya', 'Ana', 'Leila', 'Rosa'], ['Marlon', 'Andre', 'Kevin', 'Jorge', 'Dwayne', 'Luis'], ['Young', 'Flowers', 'Castillo', 'Gentle', 'Usher', 'Martinez', 'Arnold', 'Pook']),
 'Bolivia': (['Carla', 'Ximena', 'Daniela', 'Paola', 'Gabriela', 'Mariela'], ['Rodrigo', 'Álvaro', 'Marcelo', 'Diego', 'Gonzalo', 'Mauricio'], ['Mamani', 'Quispe', 'Flores', 'Choque', 'Vargas', 'Gutiérrez', 'Rojas', 'Condori']),
 'Chile': (['Constanza', 'Javiera', 'Catalina', 'Francisca', 'Antonia', 'Fernanda'], ['Benjamín', 'Vicente', 'Cristóbal', 'Felipe', 'Ignacio', 'Sebastián'], ['Muñoz', 'Rojas', 'Díaz', 'Soto', 'Contreras', 'Silva', 'Sepúlveda', 'Morales']),
 'Colombia': (['Valentina', 'Camila', 'Isabella'], ['Santiago', 'Andrés', 'Mateo'], ['Torres', 'Rojas', 'Restrepo', 'Mendoza', 'Moreno', 'Vargas']),
 'Costa Rica': (['Mariana', 'Fabiola', 'Daniela', 'Hazel', 'Natalia', 'Melissa'], ['Esteban', 'Pablo', 'Mauricio', 'Adrián', 'Jeffrey', 'Randall'], ['Vargas', 'Jiménez', 'Mora', 'Rojas', 'Solís', 'Chaves', 'Araya', 'Quesada']),
 'Dominican Republic': (['Yokasta', 'Rosanna', 'Wendy', 'Dahiana', 'Carolina', 'Yesenia'], ['Juan Carlos', 'Wilkin', 'Rafael', 'Starlin', 'Manuel', 'Ramón'], ['Rodríguez', 'Peña', 'Batista', 'Reyes', 'Almonte', 'De la Cruz', 'Santana', 'Polanco']),
 'Ecuador': (['Fernanda', 'Doménica', 'Karla', 'Andrea', 'Paulina', 'Tatiana'], ['Andrés', 'Jorge', 'Byron', 'Darwin', 'Fabricio', 'Santiago'], ['Zambrano', 'Andrade', 'Cedeño', 'Guamán', 'Vera', 'Mendoza', 'Ortiz', 'Chávez']),
 'El Salvador': (['Gabriela', 'Karla', 'Yesenia', 'Roxana', 'Claudia', 'Beatriz'], ['Óscar', 'René', 'Edwin', 'Mauricio', 'Nelson', 'Kevin'], ['Hernández', 'Martínez', 'Rivas', 'Flores', 'Portillo', 'Ayala', 'Menjívar', 'Guardado']),
 'Guatemala': (['Ana Lucía', 'Sofía', 'Mishel', 'Andrea', 'Rocío', 'Brenda'], ['Luis Fernando', 'José', 'Byron', 'Erick', 'Selvin', 'Mynor'], ['López', 'García', 'Pérez', 'Ajú', 'Xicará', 'Morales', 'Cifuentes', 'Barrios']),
 'Honduras': (['Dania', 'Keyla', 'Lourdes', 'Fátima', 'Nohelia', 'Iris'], ['Elvin', 'Darwin', 'Héctor', 'Josué', 'Melvin', 'Wilmer'], ['Zelaya', 'Reyes', 'Mejía', 'Banegas', 'Cáceres', 'Ordóñez', 'Lagos', 'Funes']),
 'Mexico': (['Ximena', 'Daniela', 'Fernanda', 'Regina', 'Guadalupe', 'Itzel'], ['Emiliano', 'Diego', 'Iker', 'Alejandro', 'Rodrigo', 'Jesús'], ['Hernández', 'García', 'Martínez', 'Ramírez', 'Cruz', 'Ortega', 'Chávez', 'Juárez']),
 'Nicaragua': (['Scarleth', 'Ingrid', 'Yaritza', 'Kenia', 'Marcela', 'Fabiola'], ['Bayardo', 'Norlan', 'Ervin', 'Danilo', 'Róger', 'Francisco'], ['Espinoza', 'Lacayo', 'Mairena', 'Somarriba', 'Téllez', 'Obando', 'Gutiérrez', 'Membreño']),
 'Panama': (['Yarisel', 'Itzel', 'Anabel', 'Katherine', 'Maribel', 'Gisela'], ['Abdiel', 'Rubén', 'Eric', 'Aquilino', 'Joel', 'Ricardo'], ['Batista', 'Castillo', 'Pinzón', 'Samudio', 'Quintero', 'Herrera', 'Moreno', 'Vergara']),
 'Paraguay': (['Fátima', 'Rocío', 'Liz', 'Nathalia', 'Mirna', 'Celeste'], ['Derlis', 'Hugo', 'Arnaldo', 'Rodrigo', 'Néstor', 'Osvaldo'], ['Benítez', 'Giménez', 'Ayala', 'Cáceres', 'Duarte', 'Villalba', 'Ortiz', 'Riveros']),
 'Peru': (['Milagros', 'Rosa', 'Kiara', 'Fiorella', 'Yessenia', 'Marisol'], ['Renzo', 'Piero', 'Christian', 'Miguel', 'Joel', 'Alonso'], ['Quispe', 'Huamán', 'Mamani', 'Flores', 'Ccahuana', 'Torres', 'Chávez', 'Vásquez']),
 'Uruguay': (['Agustina', 'Florencia', 'Lucía', 'Valentina', 'Micaela', 'Sofía'], ['Martín', 'Gonzalo', 'Santiago', 'Facundo', 'Rodrigo', 'Bruno'], ['Rodríguez', 'Pereira', 'Silva', 'Martínez', 'Sosa', 'Fernández', 'Techera', 'Olivera']),
}
# Colombia's six already have names on the site; never reuse an executive's name.
TAKEN = {'Sofía Reyes', 'Diego Navarro', 'Valentina Cruz', 'Andrés Molina', 'Camila Torres', 'Mateo Rojas', 'Lucía Fernández',
         'Javier Castillo', 'Isabella Méndez', 'Elena Vargas', 'Christopher Kesl', 'Michael Giacona'}

def woman(country, role):
    # Must match scripts/make_country_avatars.py: long hair (portrait of a woman) when this bit is 0.
    h = int(hashlib.sha256(f'{country}|{role}'.encode()).hexdigest(), 16)
    return (h >> 40) % 2 == 0

out, used = {}, set(TAKEN)
for c in COUNTRIES:
    if c == 'Colombia':
        continue
    women, men, last = NAMES[c]
    wi = mi = si = 0
    out[c] = {}
    for r in ROLES:
        # Next unused first name for the portrait's gender, next unused surname for the country.
        while True:
            if woman(c, r):
                first = women[wi % len(women)]
            else:
                first = men[mi % len(men)]
            name = f'{first} {last[si % len(last)]}'
            si += 1
            if name not in used:
                break
        if woman(c, r): wi += 1
        else: mi += 1
        used.add(name)
        out[c][r] = name

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = ('// Generated by scripts/make_country_names.py: fictional names for the AI persona country teams.\n'
      'window.CGG_COUNTRY_NAMES = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
open(os.path.join(root, 'team', 'country-names.js'), 'w', encoding='utf-8').write(js)
print(sum(len(v) for v in out.values()), 'names written to team/country-names.js')
for c, rs in out.items():
    print(f'{c}: ' + ', '.join(rs.values()))
