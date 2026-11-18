import { G, S, T, U, type UnitData } from "../a1/helpers";

/*
 * Spanish A2, units 9 and 10. Points for the native-speaker review:
 * - Vocabulary is Latin American-neutral. No vosotros forms, no "vale", no "coger".
 * - "adónde fuiste" is written with an accent and as one word (adónde) because the verb is a movement verb.
 *   "a dónde" is also accepted by the RAE, so check house preference.
 * - "lo pasé bien" is common across Latin America and Spain. Some regions prefer "me divertí" or "la pasé bien" (Mexico).
 *   Left as "lo pasé bien", please confirm.
 * - "hacía calor" and "estaba cansado" appear only as set chunks. The gloss "(said by a man)" marks the masculine form.
 * - "hacia el mediodía" (around midday) is slightly formal. In Latin America "al mediodía" or "como a las doce" is more usual.
 * - "pasado mañana" is the same everywhere. "la semana que viene" and "el mes que viene" are fine in both regions,
 *   though "la próxima semana" is also very common in Latin America.
 * - "dentro de dos días" is understood everywhere. "en dos días" is the common Latin American option.
 * - "el paraguas" (umbrella) and "el pronóstico" (forecast) are Latin American-neutral. Spain also says "la previsión".
 * - "va a hacer calor" is the forecast form used in the unit instead of "hará calor", which the learner has not met.
 * - Theme 1 of unit 9 uses past verbs (comí, estuve, trabajé) in sentences before the verb themes teach them.
 *   The tip previews them. Reorder if you would rather keep the time markers verb-free.
 * - "Salí" is glossed "I went out" and used in "Salí de casa a las ocho" with the meaning "I left".
 * - Tip bodies include "¿" and "?" for the Spanish examples. The sentence builder has no punctuation, but tips are prose.
 * - "quizás otro día" and "me encantaría" are natural but check tone for a polite refusal.
 * - Unit 10 weather: "va a haber viento" was left out in favour of "va a hacer sol", to avoid the impersonal haber pattern.
 */
export const ES_A2: UnitData[] = [
  U("Yesterday", "Talk about what happened, from this morning to last weekend.",
    G(T("Time markers", "ayer=yesterday | anoche=last night | esta mañana=this morning | la semana pasada=last week | hace dos días=two days ago | el año pasado=last year | el fin de semana pasado=last weekend | hace una hora=an hour ago",
      S("Ayer comí arroz", "Yesterday I ate rice", "hoy como"), S("Hace dos días estuve aquí", "I was here two days ago", "dentro tres"), S("La semana pasada trabajé mucho", "Last week I worked a lot", "próxima trabajo")),
      "Start with a time word", "Put a time word first to talk about the past. Ayer comí arroz means yesterday I ate rice. Hace dos días means two days ago."),
    G(T("Regular -ar verbs", "hablé=I spoke | hablaste=you spoke | habló=he or she spoke | trabajé=I worked | compré=I bought | llegué=I arrived | caminé=I walked | cociné=I cooked",
      S("Hablé con mi madre", "I spoke with my mother", "hablo hermano"), S("Ayer compré pan y queso", "Yesterday I bought bread and cheese", "compro leche"), S("Hablaste con ella", "You spoke with her", "hablé él")),
      "Past of -ar verbs", "Drop -ar and add -é for I, -aste for you and -ó for he or she. Hablé, hablaste, habló. The accent matters: hablo is now, habló is past."),
    G(T("Regular -er and -ir verbs", "comí=I ate | comiste=you ate | comió=he or she ate | bebí=I drank | salí=I went out | escribí=I wrote | aprendí=I learned | viví=I lived",
      S("Comiste pollo anoche", "You ate chicken last night", "como pescado"), S("Ayer bebí mucha agua", "Yesterday I drank a lot of water", "beber jugo"), S("Salí de casa a las ocho", "I left home at eight", "salgo nueve")),
      "Past of -er and -ir verbs", "Drop -er or -ir and add -í for I, -iste for you and -ió for he or she. Comí, comiste, comió. Both verb types use the same endings."),
    G(T("Irregular essentials", "fui=I went | fuiste=you went | hice=I did | hizo=he or she did | vi=I saw | tuve=I had | estuve=I was there | fue=it was",
      S("Fui al mercado con mi madre", "I went to the market with my mother", "voy tienda"), S("Ayer tuve mucho trabajo", "Yesterday I had a lot of work", "tengo hice"), S("Vi a tu hermano en el parque", "I saw your brother in the park", "veo hermana")),
      "Learn these as they are", "Some very common verbs have their own past forms. Fui al mercado (I went to the market). Hice la cena (I made dinner)."),
    G(T("Weekend stories", "qué hiciste=what did you do | adónde fuiste=where did you go | cómo estuvo=how was it | lo pasé bien=I had a good time | fue divertido=it was fun | hacía calor=it was hot | estaba cansado=I was tired (said by a man) | y después=and then",
      S("Qué hiciste el fin de semana pasado", "What did you do last weekend", "hice fuiste"), S("Fui al parque y lo pasé bien", "I went to the park and I had a good time", "fue voy"), S("Hacía calor y estaba cansado", "It was hot and I was tired", "hace estoy")),
      "Ask about someone's day", "Use the tú form to ask: ¿Qué hiciste ayer? means what did you do yesterday. For how things were, learn chunks like hacía calor and estaba cansado.")),

  U("Plans", "Say what you are going to do, invite friends and set a time.",
    G(T("Going to", "voy a=I am going to | vas a=you are going to | va a=he or she is going to | vamos a=we are going to | voy a viajar=I am going to travel | vamos a cenar=we are going to have dinner | no voy a trabajar=I am not going to work | qué vas a hacer=what are you going to do",
      S("Mañana voy a trabajar", "Tomorrow I am going to work", "vas fui"), S("Qué vas a hacer mañana", "What are you going to do tomorrow", "hiciste voy"), S("Ella va a llegar a las ocho", "She is going to arrive at eight", "llegó vamos")),
      "Plans with ir a", "Use ir a and a verb for plans. Voy a comer means I am going to eat. Vamos a salir means we are going to go out."),
    G(T("When", "mañana=tomorrow | pasado mañana=the day after tomorrow | la semana que viene=next week | esta noche=tonight | pronto=soon | dentro de dos días=in two days | el mes que viene=next month | el sábado que viene=next Saturday",
      S("Pasado mañana voy a viajar", "The day after tomorrow I am going to travel", "ayer fui"), S("La semana que viene estoy libre", "Next week I am free", "pasada ocupado"), S("Dentro de dos días vamos a salir", "In two days we are going to go out", "hace ayer")),
      "Looking ahead", "Que viene means next: la semana que viene. Dentro de means in, for time ahead: dentro de dos días. Pasado mañana is the day after tomorrow."),
    G(T("Invitations", "quieres venir=do you want to come | puedes venir=can you come | te invito=my treat | vamos=let's go | me encantaría=I would love to | con mucho gusto=gladly | lo siento=I am sorry | quizás otro día=maybe another day",
      S("Quieres venir al parque", "Do you want to come to the park", "quiero vamos"), S("Me encantaría pero estoy ocupado", "I would love to but I am busy", "gusto siento"), S("Lo siento no puedo hoy", "I am sorry I can't today", "quieres encantaría")),
      "Yes and no, politely", "After querer and poder, use the infinitive: ¿Quieres venir? To say no, say sorry first and give a reason: Lo siento, no puedo."),
    G(T("Appointments", "la cita=the appointment | la reunión=the meeting | a qué hora=at what time | a las tres=at three | a la una=at one | hacia el mediodía=around midday | en punto=on the dot | llegar temprano=to arrive early",
      S("La cita es a las tres", "The appointment is at three", "una reunión"), S("A qué hora es la reunión", "What time is the meeting", "cita cuándo"), S("Llego hacia el mediodía", "I will arrive around midday", "llegó tres")),
      "Telling the time", "Use a las plus the hour: a las tres. For one o'clock, say a la una. Hacia means around: hacia el mediodía."),
    G(T("Weather forecast", "el pronóstico=the forecast | va a llover=it is going to rain | va a nevar=it is going to snow | va a hacer calor=it is going to be hot | va a hacer frío=it is going to be cold | va a hacer sol=it is going to be sunny | el paraguas=the umbrella | el cielo=the sky",
      S("Mañana va a llover", "Tomorrow it is going to rain", "nevar paraguas"), S("Esta noche va a hacer frío", "Tonight it is going to be cold", "calor sol"), S("Pasado mañana va a hacer sol", "The day after tomorrow it is going to be sunny", "llover cielo")),
      "Weather plans", "For weather, use va a hacer plus calor, frío or sol. Rain and snow have their own verbs: va a llover, va a nevar.")),
];

