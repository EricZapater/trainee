-- Form Seed
INSERT INTO forms (id, entrenador_id, titol, descripcio, actiu, created_at, updated_at) 
SELECT '54ce6cee-7f18-46ec-a92f-f7e121660067', id, 'Encuesta', 'Vamos a conocernos', true, NOW(), NOW()
FROM entrenadors LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Questions Seed
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('9e3a1fb1-80a5-4724-a66b-aa4e1d246d40', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Fecha de nacimiento', 'text', NULL, true, 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('71863a29-0374-44a1-b35b-312c61eab65e', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Peso', 'number', NULL, true, 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('f774809a-ceac-4194-84a7-971bc0800de7', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Altura', 'number', NULL, false, 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('fa18fec8-2473-4732-9afb-1d3ead119d67', '54ce6cee-7f18-46ec-a92f-f7e121660067', '% de grasa corporal? ', 'number', NULL, false, 4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('0d6e4011-0835-442c-904f-e8a333786027', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'A qué te dedicas?', 'text', NULL, false, 5, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('bc760bdf-3e12-4675-990b-8178f65c132e', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Has tenido lesiones o patologías importantes? Cuales? Y en la actualidad?', 'textarea', NULL, false, 6, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('21ec6039-bc4a-4609-839c-1b96a4762af7', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Que deportes has practicado?', 'textarea', NULL, false, 7, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('431602fe-eee6-433b-b6b4-6d465e79f58a', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Te has hecho alguna vez una prueba de esfuerzo? Cuando?', 'text', NULL, false, 8, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('a389a4fb-4fc8-4f83-8f97-e2a19f1f65a2', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Estás tomando algún tipo de medicamento que se deba tener en cuenta para hacer actividad física?', 'textarea', NULL, true, 9, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('de8b60e6-6a6a-4a1a-9a08-8bc292562969', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Fumas? Media diaria? Te has planteado dejarlo ?', 'text', NULL, true, 10, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('dc57660e-26c6-4230-b30b-ced8707e5cbb', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Que cantidad de estrés conlleva tu vida diaria de 1 a 10 ? ', 'number', NULL, true, 11, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('32895f6a-792c-47e2-b3ec-ddc00c017cae', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Que cantidad de esfuerzo conlleva tu trabajo de 1 a 10?', 'text', NULL, true, 12, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('eea8ff02-83b5-4862-9007-4cc1382efd52', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Estas apuntado en un centro de fitness ? Asistes? Cuantas veces por semana ?', 'text', NULL, true, 13, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('085ca4a9-118b-4e58-93f8-46185c33b5f5', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Cuanto te gustaría dedicarle a la semana a nuestro plan de entrenamiento ? Dias/horas ( Acuérdate, no es una cuestión de cantidad, sino de calidad )', 'textarea', NULL, true, 14, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('f12e3e40-1286-4e97-a10b-eda4cfc305c8', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Cuanto hace que practicas Trail Running ?', 'text', NULL, true, 15, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('0a68346d-6ea4-473f-9724-c41e4ca5055e', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Descríbeme una semana "tipo" de entrenamiento de forma aproximada, explicándome kms semanales, tiempo semanal, cuantos días entrenas y que desnivel.', 'textarea', NULL, true, 16, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('d8e0fc10-1492-4282-83ac-698d01e26fd2', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Descríbeme un poco, que tipo de entrenamientos has hecho para trabajar la resistencia ( Si solo sales a " correr ", si has hecho series, fartleks, "tiradas largas ", etc )', 'textarea', NULL, true, 17, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('7f8fb05d-84b7-40da-b54b-94f84fe0ab47', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Descríbeme un poco que tipo de entrenamiento hacías para trabajar la fuerza y cuantas veces por semana.', 'textarea', NULL, true, 18, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('0473e2b6-948d-4b7b-a597-39ffa5832788', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Además de correr, combinas con otras disciplina, por ejemplo btt, bici de carretera, esquí de montaña, etc ?', 'textarea', NULL, true, 19, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('d04e9c17-b8c6-42f5-a514-4302d397d067', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Haces alguna otra actividad, como por ejemplo yoga, pilates, etc?', 'textarea', NULL, true, 20, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('bde65dc4-3b6e-47eb-af23-7ea3d84cf570', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Como cuantificas tu entrenamiento? a través de que plataforma ? que gadgets utilizas ? Trabajas a partir de frecuencia cardíaca, por potencia o simplemente por sensaciones ? Tienes banda de pecho o de brazo de Frecuencia Cardíaca?', 'textarea', NULL, true, 21, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('a8452d2d-2fdf-4ec0-beb4-b7b1a158b90b', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Has dejado algún entrenador o has dejado de entrenar durante un tiempo alguna vez? porque? ( No hace falta dar nombres )', 'textarea', NULL, false, 22, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('f1ad32c8-db58-4951-b1e0-e3fdec604ff2', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Como me has conocido?', 'textarea', NULL, false, 23, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('c56f5ab1-a24f-48ae-b077-4166d1c1a766', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Porque te gusta el Trail Running ?', 'textarea', NULL, true, 24, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('28a01714-b485-45cc-bf67-d7fc872863e1', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Antes de saber hacia donde vamos, me gustaría saber de donde vienes... Explícame brevemente cual ha sido tu evolución en el Trail Running, en que carreras has participado, que distancia te gusta más...', 'textarea', NULL, false, 25, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('1cbf6f44-03e1-44cb-aee7-22e1cd8d32c0', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Cuales son tus objetivos a corto plazo ? que te gustaria conseguir ? en que te gustaría mejorar ? Tres meses vista', 'textarea', NULL, true, 26, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('5e082978-bc01-4e68-9d21-cd2df7f1769d', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Cuales son tus objetivos a medio plazo ? que te gustaria conseguir ? en que te gustaría mejorar ? 8 meses vista', 'textarea', NULL, false, 27, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('6c4e2092-1539-4321-a37c-a115785fea5a', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'Cuales son tus objetivos a largo plazo ? que te gustaria conseguir ? en que te gustaría mejorar ? 1 año vista', 'textarea', NULL, true, 28, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('4a75e134-a807-4a59-8f18-a15725d228be', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'A nivel de competiciones, cuales son tus objetivos para los próximos 6 meses ?', 'textarea', NULL, false, 29, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('bd17fda7-abfc-4e25-97e8-914b8dea84ec', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'En que distancia te sientes mas comodo/a ?', 'textarea', NULL, false, 30, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('92c5f0c3-b625-4ebd-99c1-2f45a0c24cc2', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'En que crees que puedes mejorar ? Por ejemplo, en subidas, en bajadas, en llano, en mentalidad, en estrategia de competición, en alimentación, etc...', 'textarea', NULL, false, 31, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO form_questions (id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at, updated_at) 
VALUES ('d7c4b8dd-f922-4d9f-9ef5-9407ee58a946', '54ce6cee-7f18-46ec-a92f-f7e121660067', 'En que crees que eres bueno o se te da bien y porque ?', 'textarea', NULL, false, 32, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
