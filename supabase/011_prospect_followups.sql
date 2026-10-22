-- Christopher The Good Gringo: follow-up messages for businesses that haven't replied (admin Prospecting tab).
-- stage: 0 not contacted, 1 first message sent, 2 follow-up 1 sent, 3 follow-up 2 sent (no more follow-ups).
alter table public.prospects add column if not exists stage integer not null default 0;
update public.prospects set stage = 1 where stage = 0 and status in ('whatsapped','emailed','both','replied','not_interested','claimed');
alter table public.prospect_templates drop constraint if exists prospect_templates_id_check;
alter table public.prospect_templates add constraint prospect_templates_id_check check (id = any (array['whatsapp_es','whatsapp_en','email_es','email_en','f1_whatsapp_es','f1_whatsapp_en','f1_email_es','f1_email_en','f2_whatsapp_es','f2_whatsapp_en','f2_email_es','f2_email_en']));
insert into public.prospect_templates (id, subject, body, updated_at) values
('f1_whatsapp_en', null, 'Hi {name} team,

Just following up on my message from a few days ago. {name} is listed free in our {city} {finder_label}: {finder}

Claiming it is free and takes about a minute, so your details stay up to date: {claim}

Any questions, just reply here.

Best,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Email: christopher@christopherthegoodgringo.com', now()),
('f1_email_en', 'Following up: {name} on Christopher The Good Gringo', 'Hi {name} team,

Just following up on my message from a few days ago. {name} is listed free in our {city} {finder_label}: {finder}

Claiming it is free and takes about a minute, so your details stay up to date: {claim}

Any questions, just reply here.

Best,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Email: christopher@christopherthegoodgringo.com', now()),
('f2_whatsapp_en', null, 'Hi {name} team,

One last note from me: your free listing in our {city} {finder_label} is still waiting for you: {finder}

If you''d like to manage it, you can claim it for free here: {claim}

And if you ever want photos, ratings and a top spot in the results, plans start at $9.99 a month: {plans}

I won''t keep writing, but I''m always happy to help.

Best,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Email: christopher@christopherthegoodgringo.com', now()),
('f2_email_en', 'Last note: your free listing on Christopher The Good Gringo', 'Hi {name} team,

One last note from me: your free listing in our {city} {finder_label} is still waiting for you: {finder}

If you''d like to manage it, you can claim it for free here: {claim}

And if you ever want photos, ratings and a top spot in the results, plans start at $9.99 a month: {plans}

I won''t keep writing, but I''m always happy to help.

Best,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Email: christopher@christopherthegoodgringo.com', now()),
('f1_whatsapp_es', null, 'Hola, equipo de {name}:

Les escribo para dar seguimiento a mi mensaje de hace unos días. {name} aparece gratis en nuestro {finder_label} de {city}: {finder}

Reclamar su listado es gratis y toma un minuto, así sus datos siempre estarán al día: {claim}

Si tienen alguna pregunta, respondan aquí mismo.

Saludos,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Correo: christopher@christopherthegoodgringo.com', now()),
('f1_email_es', 'Seguimiento: {name} en Christopher The Good Gringo', 'Hola, equipo de {name}:

Les escribo para dar seguimiento a mi mensaje de hace unos días. {name} aparece gratis en nuestro {finder_label} de {city}: {finder}

Reclamar su listado es gratis y toma un minuto, así sus datos siempre estarán al día: {claim}

Si tienen alguna pregunta, respondan aquí mismo.

Saludos,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Correo: christopher@christopherthegoodgringo.com', now()),
('f2_whatsapp_es', null, 'Hola, equipo de {name}:

Un último mensaje de mi parte: su listado gratis en nuestro {finder_label} de {city} sigue esperándolos: {finder}

Si quieren manejarlo, pueden reclamarlo gratis aquí: {claim}

Y si algún día quieren fotos, calificaciones y un lugar destacado en los resultados, tenemos planes desde $9.99 al mes: {plans}

No les escribiré más, pero siempre estoy a la orden para ayudar.

Saludos,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Correo: christopher@christopherthegoodgringo.com', now()),
('f2_email_es', 'Último mensaje: su listado gratis en Christopher The Good Gringo', 'Hola, equipo de {name}:

Un último mensaje de mi parte: su listado gratis en nuestro {finder_label} de {city} sigue esperándolos: {finder}

Si quieren manejarlo, pueden reclamarlo gratis aquí: {claim}

Y si algún día quieren fotos, calificaciones y un lugar destacado en los resultados, tenemos planes desde $9.99 al mes: {plans}

No les escribiré más, pero siempre estoy a la orden para ayudar.

Saludos,
Christopher Kesl
Christopher The Good Gringo
WhatsApp: +1 305 440 5175
Correo: christopher@christopherthegoodgringo.com', now())
on conflict (id) do update set subject = excluded.subject, body = excluded.body, updated_at = now();
