import { S, T, U, G, type UnitData } from "../a1/helpers";

/*
 * Points for the native-speaker review:
 * 1. Imparfait chunks (il faisait beau, il pleuvait, c'était super, c'était comment) are taught as set phrases only. Check they are fine at this level.
 * 2. "il y aura du vent" and "il y aura du soleil" are futur simple chunks inside a futur proche theme. Maybe swap for "il va y avoir du vent".
 * 3. Past participle agreement: words are shown in the masculine (je suis allé). The tip says women add an e. No -e/-s variants are tested.
 * 4. "tu as fait" is glossed "did"; j'ai fait can also be "made". Check the gloss "I did" reads well.
 * 5. "où es-tu allé" uses the inverted form with a hyphen. "où tu es allé" or "tu es allé où" would be more casual. Kept the textbook form.
 * 6. Questions are written without "?" in sentences, as the generator strips punctuation. "Qu'est-ce que tu as fait hier" should read fine in the word bank.
 * 7. "on se retrouve" glossed "let's meet", "on se voit" avoided. Check the register.
 * 8. "volontiers" glossed "gladly". It can sound slightly formal to some speakers.
 * 9. "à huit heures et demie" is correct, but "demi" stays masculine only with midi/minuit. Not an issue here, but worth a glance.
 * 10. "hier matin" and "hier après-midi" are both fine. "avant-hier" is hyphenated as in the standard spelling.
 * 11. "un film" in "on a regardé un film": "on" is used for "we" with the past participle unchanged. Confirm this suits the learner.
 */

export const FR_A2: UnitData[] = [
  U("Yesterday", "Talk about what you did and when you did it.",
    G(T("When it happened", "hier=yesterday | hier soir=last night | hier après-midi=yesterday afternoon | avant-hier=the day before yesterday | ce matin=this morning | la semaine dernière=last week | le week-end dernier=last weekend | il y a deux jours=2 days ago",
      S("Hier soir j'ai mangé du poisson", "Last night I ate fish", "demain mange"), S("La semaine dernière j'ai vu ma sœur", "Last week I saw my sister", "prochaine frère"), S("Ce matin j'ai bu du café", "This morning I had coffee", "hier bois")),
      "Time words", "Put the time word first or last. Hier soir, j'ai mangé. J'ai mangé hier soir. Il y a deux jours means 2 days ago."),
    G(T("I did it", "j'ai mangé=I ate | j'ai bu=I drank | j'ai vu=I saw | j'ai fait=I did | j'ai eu=I had | j'ai acheté=I bought | j'ai pris=I took | j'ai parlé=I spoke",
      S("J'ai acheté du pain hier", "I bought bread yesterday", "achète demain"), S("Hier j'ai pris le bus", "Yesterday I took the bus", "prends train"), S("Tu as vu mon frère", "You saw my brother", "ai ma")),
      "Past with avoir", "Most past verbs use j'ai plus a past form. J'ai mangé means I ate. Tu as vu means you saw."),
    G(T("I went", "je suis allé=I went | je suis arrivé=I arrived | je suis resté=I stayed | je suis parti=I left | je suis venu=I came | je suis rentré=I went home | je suis sorti=I went out | je suis tombé=I fell",
      S("Je suis allé au marché hier", "I went to the market yesterday", "ai à"), S("Je suis rentré à la maison", "I went home", "resté parti"), S("Elle est partie hier soir", "She left last night", "a suis")),
      "Past with être", "Verbs of movement use je suis, not j'ai. Je suis allé au parc. A woman adds an e in writing: je suis allée."),
    G(T("Weekend stories", "il faisait beau=the weather was nice | il pleuvait=it was raining | c'était super=it was great | j'ai rencontré=I met | j'ai visité=I visited | j'ai dansé=I danced | j'ai dormi=I slept | on a regardé un film=we watched a film",
      S("Samedi il faisait beau", "On Saturday the weather was nice", "pleuvait fait"), S("Dimanche j'ai visité un parc", "On Sunday I visited a park", "visite école"), S("C'était super hier soir", "It was great last night", "faisait beau")),
      "How it was", "Use c'était and il faisait to say how things were. Learn them as set phrases for now. C'était super. Il faisait beau."),
    G(T("Asking about your day", "qu'est-ce que tu as fait=what did you do | qu'est-ce que vous avez fait=what did you do (polite) | où es-tu allé=where did you go | avec qui=who with | tu as bien dormi=did you sleep well | c'était comment=how was it | quand=when | tu as aimé=did you like it",
      S("Qu'est-ce que tu as fait hier", "What did you do yesterday", "fais vous"), S("Où es-tu allé ce matin", "Where did you go this morning", "suis à"), S("Tu as aimé le film", "Did you like the film", "aime un")),
      "Asking about the past", "Use tu with friends and vous with people you don't know. Qu'est-ce que tu as fait ? Qu'est-ce que vous avez fait ?")),

  U("Plans", "Say what you are going to do and make plans with friends.",
    G(T("Going to", "je vais=I am going to | tu vas=you are going to | il va=he is going to | nous allons=we are going to | vous allez=you are going to (polite or plural) | ils vont=they are going to | je vais manger=I am going to eat | je vais partir=I am going to leave",
      S("Je vais manger au restaurant", "I am going to eat at the restaurant", "ai vas"), S("Nous allons prendre le train", "We are going to take the train", "vont partir"), S("Tu vas acheter du pain", "You are going to buy bread", "ai vais")),
      "Near future", "To say what you are going to do, use aller plus a verb. Je vais manger. Nous allons partir."),
    G(T("When", "demain=tomorrow | après-demain=the day after tomorrow | ce soir=tonight | ce week-end=this weekend | la semaine prochaine=next week | le mois prochain=next month | bientôt=soon | dans deux jours=in 2 days",
      S("Je pars la semaine prochaine", "I am leaving next week", "dernière hier"), S("Demain je vais voir ma mère", "Tomorrow I am going to see my mother", "hier vu"), S("Le train arrive dans deux jours", "The train arrives in 2 days", "hier bientôt")),
      "In and ago", "Dans plus a time means in. Dans deux jours is in 2 days. Il y a deux jours is 2 days ago."),
    G(T("Invitations and replies", "tu veux venir=do you want to come | tu peux venir=can you come | vous voulez=do you want (polite) | volontiers=gladly | bonne idée=good idea | désolé=sorry | je ne peux pas=I can't | une autre fois=another time",
      S("Tu veux venir au parc", "Do you want to come to the park", "peux viens"), S("Bonne idée je suis libre ce soir", "Good idea, I am free tonight", "occupé demain"), S("Désolé je ne peux pas ce soir", "Sorry, I can't tonight", "veux demain")),
      "Want and can", "Vouloir and pouvoir are followed by a verb. Tu veux venir ? Tu peux venir ? To decline kindly, say désolé and offer une autre fois."),
    G(T("Appointments", "le rendez-vous=appointment | à quelle heure=at what time | vers midi=around noon | à midi=at noon | à deux heures=at 2 o'clock | à huit heures et demie=at half past 8 | je suis en retard=I am late | on se retrouve=let's meet",
      S("J'ai un rendez-vous à deux heures", "I have an appointment at 2 o'clock", "vers midi"), S("À quelle heure on se retrouve", "What time shall we meet", "midi demain"), S("Je suis en retard désolé", "I am late, sorry", "ai tôt")),
      "Telling the time", "À quelle heure asks what time. À midi is exactly noon. Vers midi is around noon."),
    G(T("Weather forecast", "la météo=the weather forecast | il va pleuvoir=it is going to rain | il va neiger=it is going to snow | il va faire beau=the weather will be nice | il va faire froid=it will be cold | il va faire chaud=it will be hot | il y aura du soleil=it will be sunny | il y aura du vent=it will be windy",
      S("Demain il va pleuvoir", "Tomorrow it is going to rain", "neiger hier"), S("Ce week-end il va faire beau", "It will be nice this weekend", "froid chaud"), S("Il va neiger la semaine prochaine", "It is going to snow next week", "pleuvoir hier")),
      "Forecasts", "Il va plus a weather verb says what is coming. Il va pleuvoir. Il va faire beau.")),
];
