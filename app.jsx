/* ============================================================
   PLAN DE RECOMPOSICIÓN — versión web independiente
   Sin dependencias de Claude. Los datos viven en este navegador.
   ============================================================ */

const { useState, useEffect, useRef, useMemo } = React;

/* Almacenamiento: misma interfaz que usaba el artefacto,
   implementada sobre localStorage del navegador. */
if (!window.storage) {
  window.storage = {
    get: async (k) => {
      const v = localStorage.getItem(k);
      return v === null ? null : { key: k, value: v };
    },
    set: async (k, v) => {
      localStorage.setItem(k, v);
      return { key: k, value: v };
    },
  };
}


/* ============================================================
   PLAN DE RECOMPOSICIÓN — app personal de seguimiento
   Ciclo 1 · 2 torso + 1 accesorios + fisio · ayuno 16:8
   ============================================================ */

const STORE_KEY = "fitplan:v2";

/* ---------- Ventanas de alimentación ---------- */

const WINDOWS = {
  temprano: {
    label: "16:8 temprano · 6:30 a 14:30",
    start: 6.5, end: 14.5,
    meals: [
      { t: 6.5, label: "Desayuno · rompe el ayuno", def: "r2" },
      { t: 12.5, label: "Almuerzo · comida principal", def: "r1" },
      { t: 14.5, label: "Snack · cierra la ventana", def: "r7" },
    ],
    note: "Tu opción. Encaja con horario de oficina y te deja las tardes libres de comida. Exige entrenar en la mañana o al mediodía.",
  },
  seis: {
    label: "18:6 · 6:30 a 12:30",
    start: 6.5, end: 12.5,
    meals: [
      { t: 6.5, label: "Desayuno · rompe el ayuno", def: "r2" },
      { t: 10.5, label: "Media mañana", def: "r7" },
      { t: 12.5, label: "Almuerzo · cierra la ventana", def: "r3" },
    ],
    note: "Dos horas menos de ventana no te dan ningún beneficio extra y sí te obligan a comidas enormes. Úsalo solo si te resulta más cómodo, no por creer que quema más.",
  },
  tarde: {
    label: "16:8 tarde · 12:00 a 20:00",
    start: 12, end: 20,
    meals: [
      { t: 12, label: "Comida 1 · rompe el ayuno", def: "r2" },
      { t: 15.5, label: "Comida 2 · principal", def: "r1" },
      { t: 19.5, label: "Comida 3 · cierra la ventana", def: "r3" },
    ],
    note: "Úsala los días que entrenas de noche: así la sesión y la comida posterior caen dentro de la ventana.",
  },
};

const TARGETS = {
  entreno: { kcal: 2300, p: 160, c: 255, g: 70 },
  descanso: { kcal: 1850, p: 160, c: 155, g: 65 },
};

const DAY_TYPES = {
  torsoA: { label: "Torso A · empuje", macro: "entreno", tone: "go" },
  torsoB: { label: "Torso B · tracción", macro: "entreno", tone: "go" },
  acc: { label: "Accesorios", macro: "entreno", tone: "go" },
  fisio: { label: "Fisioterapia", macro: "descanso", tone: "warn" },
  cardio: { label: "Cardio suave", macro: "descanso", tone: "warn" },
  descanso: { label: "Descanso", macro: "descanso", tone: "muted" },
  ayuno24: { label: "Ayuno 24 h", macro: "descanso", tone: "stop" },
};

/* ---------- Sesiones: 5 ejercicios, series de aproximación ---------- */

const SESSIONS = {
  torsoA: {
    title: "Torso A — empuje dominante",
    dur: "50–60 min",
    warm: "5 min elíptica o caminar rápido + rotaciones de hombro con banda 2×15 + puente de glúteo 2×10.",
    ex: [
      {
        id: "a1", n: "Press banca con mancuernas", ap: 2, s: 3, r: "8–10", rir: "2 · última serie RIR 1",
        yt: "press de banca con mancuernas tecnica",
        how: [
          "Acuéstate en la banca con una mancuerna en cada mano a la altura del pecho, palmas hacia adelante. Pies firmes en el piso; si eso te arquea el lumbar, súbelos a un step.",
          "Junta los omóplatos como si sostuvieras un lápiz entre ellos, y mantenlos así todo el ejercicio.",
          "Empuja hacia arriba hasta casi estirar el codo, sin bloquearlo. Baja en 2–3 segundos hasta que los codos queden a la altura del torso.",
          "Los codos van a unos 45° del cuerpo, no abiertos en cruz.",
        ],
        err: "Bajar de más buscando rango: el hombro se va hacia adelante y ahí es donde se lesiona.",
      },
      {
        id: "a2", n: "Remo con pecho apoyado", ap: 1, s: 3, r: "10–12", rir: "2",
        yt: "remo con mancuernas pecho apoyado banca inclinada",
        how: [
          "Pon el respaldo de una banca a unos 45° y acuéstate boca abajo sobre él, con el pecho apoyado y una mancuerna en cada mano colgando.",
          "Tira llevando los codos hacia atrás y hacia las costillas, como si guardaras algo en el bolsillo de atrás del pantalón.",
          "Aprieta la espalda un segundo arriba y baja controlado hasta estirar el brazo.",
        ],
        err: "Tirar con los bíceps y encoger los hombros hacia las orejas. El pecho apoyado es lo que le quita la carga a tu lumbar: no lo despegues.",
      },
      {
        id: "a3", n: "Press militar sentado con respaldo", ap: 1, s: 3, r: "8–10", rir: "2",
        yt: "press militar sentado con mancuernas tecnica",
        how: [
          "Siéntate con el respaldo casi vertical (80–85°), mancuernas a la altura de las orejas, palmas al frente.",
          "Aprieta abdomen y glúteo para que la espalda baja no se despegue del respaldo en ningún momento.",
          "Empuja hacia arriba hasta casi estirar, sin adelantar la cabeza, y baja controlado.",
        ],
        err: "Arquear la lumbar para sacar la última repetición. Con tu L4-L5 eso es exactamente lo que no puedes hacer: si necesitas arquearte, la serie terminó.",
      },
      {
        id: "a4", n: "Jalón al pecho, agarre neutro", ap: 0, s: 3, r: "10–12", rir: "2",
        yt: "jalon al pecho agarre neutro tecnica",
        how: [
          "Ajusta la almohadilla para que las rodillas queden fijas. Toma la barra con agarre neutro (palmas enfrentadas) o el triángulo en V.",
          "Antes de tirar, baja los hombros. Lleva el agarre hacia la parte alta del pecho con el tronco casi vertical.",
          "Sube controlado hasta estirar los brazos por completo y siente cómo se abre la espalda.",
        ],
        err: "Echar el tronco hacia atrás para impulsarse. Si tienes que mecerte, baja el peso.",
      },
      {
        id: "a5", n: "Circuito de core: dead bug + plancha lateral", ap: 0, s: 3, r: "8 por lado + 25 s por lado", rir: null,
        yt: "dead bug y plancha lateral tecnica correcta",
        how: [
          "Dead bug: boca arriba, brazos al techo, rodillas y caderas a 90°. Aplasta la lumbar contra el piso y exhala. Baja un brazo y la pierna contraria sin que la lumbar se despegue; si se despega, ahí está tu rango. Alterna 8 por lado.",
          "Sin descanso, pasa a plancha lateral: apoyado en el antebrazo (codo bajo el hombro) y el canto del pie. Sube la cadera hasta formar una línea recta y aprieta el glúteo. 25 s por lado.",
          "Descansa 60 s y repite. Tres rondas.",
        ],
        err: "Ir rápido. Estos dos no son ejercicios de fuerza, son de control: el objetivo es que la columna no se mueva mientras las extremidades sí.",
      },
    ],
  },
  torsoB: {
    title: "Torso B — tracción dominante",
    dur: "50–60 min",
    warm: "5 min elíptica + face pull con banda 2×15 + puente de glúteo 2×10.",
    ex: [
      {
        id: "b1", n: "Dominadas asistidas con banda", ap: 2, s: 4, r: "6–8", rir: "2 · última serie RIR 1",
        yt: "dominadas asistidas con banda elastica tecnica",
        how: [
          "Cuelga una banda de la barra y mete una rodilla dentro. Agarre al ancho de los hombros, palmas al frente o neutras.",
          "Cruza los tobillos y deja las rodillas semiflexionadas: colgar con las piernas estiradas tracciona el psoas, que ya tienes sobrecargado.",
          "Primero baja los hombros, después tira llevando los codos hacia las costillas hasta que la barbilla pase la barra.",
          "Baja en 2–3 segundos. No te sueltes de golpe.",
        ],
        err: "Impulsarse con la cadera (kipping). Cero balanceo mientras la lumbar esté en recuperación. Si no llegas a 6 repeticiones limpias, usa una banda más gruesa o el jalón.",
      },
      {
        id: "b2", n: "Remo sentado en polea", ap: 1, s: 3, r: "10–12", rir: "2",
        yt: "remo sentado en polea baja tecnica",
        how: [
          "Siéntate con las rodillas algo flexionadas y los pies apoyados en la plataforma. Tronco vertical.",
          "Tira del agarre hacia el ombligo llevando los codos atrás, sin mover el tronco ni un centímetro.",
          "Vuelve controlado y deja que la escápula se abra al final del recorrido.",
        ],
        err: "Mecer el tronco hacia atrás para mover más peso. Ese balanceo es flexión y extensión repetida de tu lumbar bajo carga.",
      },
      {
        id: "b3", n: "Press inclinado con mancuernas", ap: 1, s: 3, r: "8–10", rir: "2",
        yt: "press inclinado con mancuernas tecnica",
        how: [
          "Banca a 30–45°, mancuernas a la altura del pecho, palmas al frente.",
          "Omóplatos juntos y pegados a la banca; el pecho arriba.",
          "Empuja hacia arriba y ligeramente hacia adentro, y baja en 2–3 segundos hasta la altura del pecho.",
        ],
        err: "Poner la banca casi vertical: deja de ser pecho y se convierte en hombro.",
      },
      {
        id: "b4", n: "Face pull", ap: 0, s: 3, r: "15", rir: "2",
        yt: "face pull tecnica correcta cuerda",
        how: [
          "Pon una cuerda en la polea a la altura de la cara. Agarra los extremos con los pulgares apuntando hacia atrás.",
          "Tira hacia la cara separando las manos, con los codos altos, a la altura de los hombros.",
          "Aprieta un segundo atrás y vuelve controlado.",
        ],
        err: "Tirar hacia el pecho con los codos bajos: eso es un remo. Este ejercicio es tu seguro para el hombro en un plan con tanto empuje, hazlo bien.",
      },
      {
        id: "b5", n: "Circuito de core: bird dog + pallof press", ap: 0, s: 3, r: "8 por lado + 10 por lado", rir: null,
        yt: "bird dog y pallof press tecnica",
        how: [
          "Bird dog: en cuadrupedia, manos bajo los hombros y rodillas bajo las caderas. Estira el brazo derecho al frente y la pierna izquierda atrás a la vez, sin pasar la línea del cuerpo. Mantén 2 s sin que la cadera rote. Alterna 8 por lado.",
          "Pallof press: de pie, de costado a una polea a la altura del pecho, agarre con las dos manos en el esternón. Sepárate hasta que haya tensión y estira los brazos al frente resistiendo el giro. Mantén 2 s. 10 por lado.",
          "Descansa 60 s y repite. Tres rondas.",
        ],
        err: "En el bird dog, subir la pierna de más y arquear la lumbar. En el pallof, dejar que el cuerpo gire: todo el punto es que no gire.",
      },
    ],
  },
  acc: {
    title: "Accesorios — brazos, hombros, core",
    dur: "40–45 min",
    warm: "5 min caminata + rotaciones de hombro con banda 2×15.",
    ex: [
      {
        id: "c1", n: "Press con mancuernas neutro, sentado", ap: 1, s: 3, r: "10", rir: "2",
        yt: "press hombro mancuernas agarre neutro sentado",
        how: [
          "Sentado con respaldo, mancuernas a la altura de las orejas con las palmas enfrentadas entre sí.",
          "El agarre neutro es más amable con el hombro que el clásico: usa este si sientes pinzamiento en el press normal.",
          "Empuja arriba sin bloquear del todo y baja controlado.",
        ],
        err: "Despegar la espalda del respaldo.",
      },
      {
        id: "c2", n: "Elevaciones laterales", ap: 0, s: 3, r: "12–15", rir: "1",
        yt: "elevaciones laterales tecnica correcta",
        how: [
          "De pie, mancuernas a los costados, codos ligeramente flexionados y fijos así.",
          "Sube los brazos hacia los lados hasta la altura del hombro, guiando con el codo, no con la mano.",
          "Baja en 2–3 segundos.",
        ],
        err: "Usar peso de más y lanzar las mancuernas con la cadera. Este ejercicio se arruina con inercia: 4 o 6 kg bien hechos superan a 10 mal hechos.",
      },
      {
        id: "c3", n: "Curl con mancuernas + curl martillo (serie compuesta)", ap: 1, s: 3, r: "10 curl + 8 martillo", rir: "1",
        yt: "curl biceps mancuernas y curl martillo tecnica",
        how: [
          "Curl normal: de pie, palmas hacia arriba, codos pegados al costado. Sube sin mover el hombro y baja controlado. 10 repeticiones.",
          "Sin soltar las mancuernas, gira las palmas a posición neutra (martillo, palmas enfrentadas) y haz 8 repeticiones más.",
          "Esa segunda parte es la que hace exigente la serie: el martillo entra cuando el bíceps ya está cansado.",
        ],
        err: "Balancear el torso o usar impulso de cadera para subir el peso.",
      },
      {
        id: "c4", n: "Extensión de tríceps en polea con cuerda", ap: 0, s: 3, r: "12", rir: "1",
        yt: "extension de triceps en polea con cuerda tecnica",
        how: [
          "Cuerda en la polea alta, un paso atrás, tronco ligeramente inclinado hacia adelante.",
          "Codos fijos junto al torso: lo único que se mueve es el antebrazo.",
          "Estira abriendo la cuerda al final del recorrido y vuelve controlado.",
        ],
        err: "Separar los codos del cuerpo y convertirlo en un empuje de pecho.",
      },
      {
        id: "c5", n: "Circuito core y glúteo: plancha + puente", ap: 0, s: 3, r: "40 s + 12 repeticiones", rir: null,
        yt: "plancha frontal y puente de gluteo tecnica",
        how: [
          "Plancha frontal: antebrazos en el piso, codos bajo los hombros. Aprieta el glúteo y lleva las costillas hacia abajo para que la espalda quede plana. 40 s respirando normal.",
          "Puente de glúteo: boca arriba, rodillas dobladas, pies cerca del glúteo. Empuja con los talones y sube la cadera apretando el glúteo hasta la línea rodilla-hombro. 12 repeticiones.",
          "Descansa 60 s y repite. Tres rondas.",
        ],
        err: "En la plancha, dejar hundir la lumbar. En el puente, subir de más buscando altura: pasado el punto de línea recta el trabajo lo hace tu espalda baja, no el glúteo. Confirma con tu fisio antes de añadirle peso.",
      },
    ],
  },
};

/* ---------- Movilidad diaria ---------- */

const STRETCH = {
  am: {
    title: "Al levantarte",
    dur: "7 min",
    intro: "En la primera hora del día el disco lumbar está más hidratado y es cuando peor tolera doblarse hacia adelante. Por eso esta rutina es activación y extensión, no estiramiento.",
    ex: [
      { id: "am1", n: "Respiración diafragmática", d: "10 respiraciones", yt: "respiracion diafragmatica tumbado tecnica", cue: "Boca arriba, rodillas dobladas, una mano en el abdomen. Inhala 4 s hinchando la barriga, exhala 6 s. Prepara el core antes de moverte." },
      { id: "am2", n: "Deslizamiento de talón", d: "10 por lado", yt: "heel slides ejercicio rodilla", cue: "Boca arriba, desliza el talón estirando y doblando la rodilla dentro del rango sin dolor. Lubrica la rodilla izquierda antes de cargarla el resto del día." },
      { id: "am3", n: "Puente de glúteo", d: "2 × 10", yt: "puente de gluteo tecnica", cue: "Empuja con el talón y termina apretando el glúteo. Si lo sientes en la lumbar, sube menos: el trabajo es del glúteo." },
      { id: "am4", n: "Bird dog", d: "6 por lado", yt: "bird dog ejercicio tecnica", cue: "Brazo y pierna opuestos, sin que la cadera rote. Lento; esto es control, no cardio." },
      { id: "am5", n: "Extensión en prono suave (McKenzie)", d: "8 × 3 s", yt: "extension en prono mckenzie sobre codos", cue: "Boca abajo apoyado en los codos, sube el pecho sin forzar. Si aparece dolor que baja por la pierna u hormigueo, para de inmediato y coméntalo con tu fisio." },
      { id: "am6", n: "Rotación torácica en cuadrupedia", d: "8 por lado", yt: "rotacion toracica cuadrupedia open book", cue: "Mano en la nuca, abre el codo hacia el techo. El giro sale del pecho; la cadera y la lumbar quedan quietas." },
      { id: "am7", n: "Zancada corta con glúteo activo", d: "20 s por lado", yt: "estiramiento flexor de cadera con retroversion pelvica", cue: "Paso corto, mete la pelvis y aprieta el glúteo de atrás. Rango corto a propósito: no vas a estirar el psoas a fondo, está sobrecargado." },
    ],
  },
  pm: {
    title: "Antes de dormir",
    dur: "9 min",
    intro: "Aquí sí buscas soltar, con la columna apoyada en todo momento. Exhala en cada estiramiento: si aguantas el aire, el músculo no cede.",
    ex: [
      { id: "pm1", n: "Descarga lumbar 90/90", d: "2 min", yt: "posicion 90 90 descarga lumbar suelo", cue: "Boca arriba con las pantorrillas sobre una silla o el sofá, cadera y rodilla a 90°. Descomprime la lumbar sin flexionarla. Lo mejor que puedes hacer tras un día de escritorio." },
      { id: "pm2", n: "Glúteo y piramidal tumbado", d: "30 s por lado", yt: "estiramiento gluteo rodilla al hombro opuesto tumbado", cue: "Boca arriba, lleva la rodilla hacia el hombro opuesto, cruzando el cuerpo. Esta versión cierra la pierna en vez de abrirla, así que no toca el aductor." },
      { id: "pm3", n: "Isquiotibiales con banda", d: "30 s por lado", yt: "estiramiento isquiotibiales tumbado con banda", cue: "Boca arriba, banda en el pie, pierna casi recta hacia arriba y la otra doblada. La lumbar no se despega del piso y la pierna no se abre hacia afuera." },
      { id: "pm4", n: "Cuádriceps de pie", d: "30 s por lado", yt: "estiramiento cuadriceps de pie tecnica", cue: "Con apoyo en la pared, talón al glúteo y pelvis metida. Si sientes tirón en la ingle, reduce el rango: ahí ya estás tocando el psoas." },
      { id: "pm5", n: "Apertura de pecho en el marco de la puerta", d: "30 s por lado", yt: "estiramiento pectoral en marco de puerta", cue: "Antebrazo en el marco, codo a la altura del hombro, gira el tronco despacio. Contrapesa ocho horas de teclado." },
      { id: "pm6", n: "Cuello: trapecio y escaleno", d: "30 s por lado", yt: "estiramiento trapecio y escaleno cuello", cue: "Inclina la cabeza hacia el hombro y deja caer el brazo opuesto. Sin tirar con la mano." },
      { id: "pm7", n: "Respiración 4-7-8", d: "2 min", yt: "respiracion 4 7 8 tecnica", cue: "Inhala 4, retén 7, exhala 8. Baja el pulso y mejora el sueño, que es donde de verdad se construye el músculo." },
    ],
  },
};

const STRETCH_AVOID = [
  "Tocarte los pies de pie o sentado: flexión lumbar con el peso del tronco encima.",
  "Mariposa, rana, split lateral o cualquier apertura amplia de piernas. Es justo el gesto que te duele.",
  "Estirar el aductor derecho de cualquier forma, hasta tener los exámenes.",
  "Zancada profunda para psoas. En sobrecarga, estirar irrita más de lo que suelta.",
  "Torsión sentada forzada y cobra completa con brazos extendidos.",
  "Estirar hasta el límite del dolor. Estiramiento es tensión leve que cede al exhalar; si duele, te pasaste.",
];

const RESTRICTIONS = [
  { tone: "stop", t: "Flexión lumbar cargada", d: "Crunches, sit-ups, V-ups, elevación de piernas colgado, toes-to-bar, abdominales en máquina.", why: "Protrusión L4-L5: comprime el disco justo en la dirección que lo lesionó. Además elevar piernas trabaja psoas, ya sobrecargado." },
  { tone: "stop", t: "Impacto y cargas súbitas", d: "Saltos, pliometría, burpees, cuerda, sprints, fútbol, subir escaleras corriendo.", why: "Edema óseo subcondral en platillo tibial. El hueso responde mal a picos de carga; por eso aún sientes resentimiento al saltar." },
  { tone: "stop", t: "Abducción amplia y estiramiento de aductor", d: "Sentadilla sumo, aperturas amplias, Copenhagen plank, máquina de abductores en rango completo, estirar el aductor.", why: "Sospecha de tendinopatía en la inserción del aductor derecho. Estirar una tendinopatía la irrita; se trata cargándola progresivamente, y eso lo define el examen." },
  { tone: "stop", t: "Rotación de tronco con carga", d: "Giros con disco, leñador pesado, russian twists.", why: "Flexión más rotación es la combinación que más estresa el disco lumbar." },
  { tone: "stop", t: "Bisagra de cadera con carga alta", d: "Peso muerto convencional pesado, buenos días, remo con barra inclinado pesado.", why: "No para siempre: entra cuando el fisio dé el alta lumbar. Por ahora el remo va con pecho apoyado." },
  { tone: "warn", t: "Bici estática", d: "Sillín alto, resistencia baja, 20–25 min máximo.", why: "Flexión de cadera repetida es psoas. Si al día siguiente sientes tirón en la ingle izquierda, cámbiala por elíptica." },
  { tone: "warn", t: "Colgarse de la barra", d: "Rodillas semiflexionadas y tobillos cruzados.", why: "Colgar con las piernas extendidas tracciona psoas y pelvis." },
  { tone: "warn", t: "Abducción con banda", d: "Rango corto, sin dolor, solo si el fisio lo aprueba.", why: "Es útil para glúteo medio, pero abrir la pierna es justo el gesto que te duele hoy." },
  { tone: "go", t: "Cardio permitido", d: "Caminar 7 000–9 000 pasos diarios, elíptica, natación.", why: "Cero impacto, suma al déficit y no compite con la recuperación." },
  { tone: "go", t: "Core antiextensión", d: "Dead bug, bird dog, plancha frontal y lateral, pallof press.", why: "Lo que pediste como prioridad: abdomen y glúteo protegiendo la lumbar, sin doblar la columna." },
];

/* ---------- Recetas ---------- */

const RECIPES = {
  r1: {
    n: "Bowl de arroz con pechuga y aguacate",
    tag: "Día de entreno",
    m: { kcal: 650, p: 46, c: 62, g: 17 },
    ing: ["200 g de arroz cocido", "180 g de pechuga de pollo", "60 g de aguacate", "150 g de vegetales (brócoli, zanahoria o pimentón)", "1 cdita de aceite de oliva", "Sal, pimienta, paprika, ajo en polvo"],
    steps: [
      "Corta la pechuga en cubos de 2 cm y sazónala con sal, pimienta, paprika y ajo en polvo. Déjala 10 min mientras preparas lo demás.",
      "Calienta una sartén a fuego medio-alto con la cdita de aceite. Pon el pollo y no lo muevas por 3 min: así se sella y queda jugoso. Voltea y cocina 3–4 min más.",
      "Saca el pollo y en la misma sartén saltea los vegetales 4 min con un chorrito de agua para que se cocinen al vapor.",
      "Sirve el arroz de base, encima el pollo y los vegetales, y el aguacate en láminas al final.",
    ],
    note: "Cocina el arroz y el pollo para 3 porciones el domingo: se guarda 3 días en nevera. El aguacate se corta en el momento.",
  },
  r2: {
    n: "Avena nocturna con yogur griego",
    tag: "Rompe el ayuno · 0 cocción",
    m: { kcal: 525, p: 32, c: 60, g: 14 },
    ing: ["60 g de avena en hojuelas", "200 g de yogur griego natural", "20 g de semillas de calabaza", "20 g de arándanos deshidratados", "120 ml de agua o leche", "Canela"],
    steps: [
      "En un frasco, mezcla la avena con el yogur y el líquido. Revuelve hasta que no queden hojuelas secas.",
      "Añade canela y los arándanos, tapa y deja en la nevera de una noche a la otra (mínimo 6 h).",
      "Al momento de comer, agrega las semillas de calabaza por encima para que queden crocantes.",
    ],
    note: "Prepara 3 frascos de una vez. Es la comida más rápida para las 6:30 a.m., cuando no tienes tiempo de cocinar nada.",
  },
  r3: {
    n: "Lentejas con carne magra y plátano asado",
    tag: "Día de entreno · comida fuerte",
    m: { kcal: 650, p: 51, c: 80, g: 12 },
    ing: ["250 g de lentejas cocidas", "150 g de res magra (punta de anca o muchacho)", "1 plátano maduro pequeño (100 g)", "1/2 cebolla, 1 tomate, 1 diente de ajo", "Comino, sal, pimienta"],
    steps: [
      "Precalienta el horno a 200 °C. Corta el plátano por la mitad a lo largo, ponlo en una lata y hornéalo 20 min. Sin aceite: el azúcar del plátano lo carameliza solo.",
      "Sofríe la cebolla, el tomate y el ajo picados 5 min en una olla con poquísimo aceite.",
      "Añade las lentejas cocidas con un poco de su caldo, comino y sal. Cocina 8 min a fuego bajo.",
      "Aparte, sella la carne cortada en tiras 2 min por lado en sartén bien caliente. Sal al final, no antes.",
      "Sirve las lentejas, la carne encima y el plátano al lado.",
    ],
    note: "Cocina las lentejas en lote: 500 g secas rinden cerca de 1,2 kg cocidas. Congélalas en porciones de 250 g.",
  },
  r4: {
    n: "Pasta con carne molida magra",
    tag: "Día de entreno · post-entreno",
    m: { kcal: 610, p: 44, c: 72, g: 12 },
    ing: ["90 g de pasta seca", "150 g de carne molida magra (90/10)", "150 g de salsa de tomate natural", "1/2 cebolla, 1 diente de ajo", "Orégano, sal, pimienta"],
    steps: [
      "Pon la pasta a cocinar en agua con sal, un minuto menos de lo que diga el paquete.",
      "Mientras hierve, dora la carne molida en sartén caliente sin aceite, deshaciéndola con cuchara de palo, 5 min.",
      "Agrega cebolla y ajo picados, cocina 3 min y añade la salsa de tomate con orégano. Deja 5 min a fuego bajo.",
      "Escurre la pasta reservando medio pocillo del agua, mézclala con la salsa y añade ese agua para que ligue.",
    ],
    note: "La carne 90/10 es clave: la 80/20 te suma unos 15 g de grasa que no tienes presupuestados.",
  },
  r5: {
    n: "Tortillas con huevo y aguacate",
    tag: "Cualquier día · 10 min",
    m: { kcal: 435, p: 22, c: 30, g: 22 },
    ing: ["3 huevos", "2 tortillas de maíz", "50 g de aguacate", "Tomate y cebolla picados", "Sal, pimienta"],
    steps: [
      "Calienta las tortillas 30 s por lado en una sartén seca, hasta que se inflen un poco. Resérvalas tapadas con un paño.",
      "Bate los huevos con sal y pimienta y cocínalos a fuego bajo, revolviendo despacio: fuego bajo da huevo cremoso, fuego alto da huevo chicloso.",
      "Rellena las tortillas con el huevo, el tomate y la cebolla, y termina con el aguacate.",
    ],
    note: "Para día de descanso usa 2 huevos y 2 claras: bajas unas 90 kcal, casi todas de grasa.",
  },
  r6: {
    n: "Ensalada tibia de papa, atún y huevo",
    tag: "Día de descanso",
    m: { kcal: 525, p: 44, c: 54, g: 14 },
    ing: ["300 g de papa cocida", "150 g de atún en agua, escurrido", "1 huevo duro", "40 g de aguacate", "Cebolla roja, cilantro, limón", "Sal, pimienta"],
    steps: [
      "Cocina las papas enteras con piel en agua con sal, 20–25 min, hasta que un cuchillo entre sin resistencia. Con piel absorben menos agua y quedan más firmes.",
      "En la misma olla pon el huevo los últimos 10 min.",
      "Pela y corta las papas en cubos tibios y mézclalas con el atún, la cebolla en pluma y el cilantro.",
      "Aliña con limón, sal y pimienta, y sirve con el huevo en rodajas y el aguacate.",
    ],
    note: "Papa fría de un día para otro sube su almidón resistente: menos impacto en glucosa y te llena más.",
  },
  r7: {
    n: "Snack de yogur griego y frutos secos",
    tag: "Cierra la ventana · 2 min",
    m: { kcal: 275, p: 22, c: 10, g: 16 },
    ing: ["200 g de yogur griego natural", "25 g de nueces o almendras", "Canela"],
    steps: [
      "Sirve el yogur, añade los frutos secos y espolvorea canela.",
      "Si es tu última comida del día, sube el yogur a 250–300 g: es proteína de digestión lenta y vas a pasar 16 h sin comer.",
    ],
    note: "Pesa los frutos secos. 25 g son un puñado corto; 60 g son 400 kcal y se van sin que lo notes.",
  },
};

/* ---------- Lista de mercado ---------- */

const MARKET = [
  {
    ciclo: "Quincenal · fresco",
    sub: "Rinde 14 días con las 7 recetas rotando",
    groups: [
      { g: "Proteína", items: ["Pechuga de pollo — 2,5 kg", "Res magra, punta de anca o muchacho — 1 kg", "Carne molida magra 90/10 — 600 g", "Huevos — 40 unidades", "Yogur griego natural — 2 kg"] },
      { g: "Verduras", items: ["Brócoli — 1 kg", "Zanahoria — 1 kg", "Pimentón — 6 unidades", "Cebolla cabezona — 1 kg", "Cebolla roja — 2 unidades", "Tomate — 1,5 kg", "Espinaca o lechuga — 400 g", "Ajo — 2 cabezas", "Cilantro — 1 manojo"] },
      { g: "Carbohidratos frescos", items: ["Papa — 3 kg", "Plátano maduro — 6 unidades", "Tortillas de maíz — 2 paquetes"] },
      { g: "Grasas y fruta", items: ["Aguacate Hass — 6 unidades (3 maduros, 3 verdes)", "Limón — 10 unidades"] },
    ],
  },
  {
    ciclo: "Mensual · despensa",
    sub: "Se compra una vez y no se vuelve a pensar",
    groups: [
      { g: "Granos y cereales", items: ["Arroz — 4 kg", "Pasta — 2 kg", "Avena en hojuelas — 2 kg", "Lentejas secas — 2 kg", "Frijol seco — 500 g"] },
      { g: "Enlatados", items: ["Atún en agua — 16 latas", "Tomate triturado o salsa natural — 6 latas"] },
      { g: "Frutos secos y semillas", items: ["Nueces o almendras — 700 g", "Semillas de calabaza — 400 g", "Arándanos deshidratados — 400 g"] },
      { g: "Otros", items: ["Aceite de oliva — 500 ml", "Especias: paprika, comino, orégano, canela, ajo en polvo, pimienta negra", "Café o té — al gusto, ayudan en las horas de ayuno"] },
    ],
  },
];

const TONES = {
  go: { c: "var(--go)", bg: "var(--go-bg)", l: "Permitido" },
  warn: { c: "var(--warn)", bg: "var(--warn-bg)", l: "Con criterio" },
  stop: { c: "var(--stop)", bg: "var(--stop-bg)", l: "Evitar hoy" },
  muted: { c: "var(--muted)", bg: "var(--surface2)", l: "" },
};

/* ---------- Helpers ---------- */

const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const parseIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s, n) => {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const pretty = (s) => {
  const d = parseIso(s);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
};
const mondayOf = (s) => addDays(s, -((parseIso(s).getDay() + 6) % 7));
const hhmm = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const defaultType = (s) => {
  const dow = parseIso(s).getDay();
  return { 1: "torsoA", 2: "fisio", 3: "torsoB", 4: "fisio", 5: "acc", 6: "cardio", 0: "descanso" }[dow];
};
const ytUrl = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/* ---------- App ---------- */

function App() {
  const [tab, setTab] = useState("hoy");
  const [today, setToday] = useState(() => iso(new Date()));
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("cargando");
  const first = useRef(true);

  useEffect(() => {
    (async () => {
      const blank = { plan: {}, logs: {}, meals: {}, metrics: [], check: {}, market: {}, win: "temprano" };
      try {
        const res = await window.storage.get(STORE_KEY);
        const raw = res ? JSON.parse(res.value) : {};
        setData({ ...blank, ...raw });
      } catch (e) {
        setData(blank);
      }
      setStatus("ok");
    })();
  }, []);

  useEffect(() => {
    if (!data) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(async () => {
      try {
        setStatus("guardando");
        await window.storage.set(STORE_KEY, JSON.stringify(data));
        setStatus("ok");
      } catch (e) {
        setStatus("error");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [data]);

  const up = (fn) => setData((d) => fn({ ...d }));

  if (!data) {
    return (<div style={{ padding: 40, fontFamily: "system-ui", color: "#6E7F86" }}><Style />Cargando tu plan…</div>);
  }

  const type = data.plan[today] || defaultType(today);
  const win = WINDOWS[data.win] || WINDOWS.temprano;

  return (
    <div className="app">
      <Style />
      <header className="hd">
        <div>
          <div className="eyebrow">Ciclo 1 · torso + accesorios + fisio</div>
          <h1>Recomposición</h1>
        </div>
        <div className="save" data-s={status}>{status === "guardando" ? "Guardando" : status === "error" ? "Sin guardar" : "Guardado"}</div>
      </header>

      <nav className="tabs">
        {[["hoy", "Hoy"], ["semana", "Semana"], ["entreno", "Entrenos"], ["movilidad", "Movilidad"], ["comida", "Comida"], ["mercado", "Mercado"], ["progreso", "Progreso"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "tab on" : "tab"} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      <main>
        {tab === "hoy" && <Hoy date={today} setDate={setToday} type={type} win={win} data={data} up={up} />}
        {tab === "semana" && <Semana anchor={today} setDate={setToday} data={data} up={up} go={() => setTab("hoy")} />}
        {tab === "entreno" && <Entrenos />}
        {tab === "movilidad" && <Movilidad date={today} setDate={setToday} data={data} up={up} />}
        {tab === "comida" && <Comida win={win} data={data} up={up} />}
        {tab === "mercado" && <Mercado data={data} up={up} />}
        {tab === "progreso" && <Progreso data={data} up={up} />}
      </main>

      <footer className="ft">
        Plan orientativo. Cualquier ejercicio nuevo, y sobre todo el trabajo de cadera y pierna, pásalo primero por tu fisioterapeuta: quien te evalúa en persona manda sobre esta app.
      </footer>
    </div>
  );
}

/* ---------- Guía de ejercicio ---------- */

function Guide({ ex }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="guide">
      <button className="glink" onClick={() => setOpen(!open)}>{open ? "Ocultar guía" : "Cómo se hace"}</button>
      {open && (
        <div className="gbody">
          {ex.how ? <ol>{ex.how.map((s, i) => <li key={i}>{s}</li>)}</ol> : <p>{ex.cue}</p>}
          {ex.err && <p className="gerr"><strong>Error más común.</strong> {ex.err}</p>}
          {ex.yt && <a className="gyt" href={ytUrl(ex.yt)} target="_blank" rel="noreferrer">Ver en video ↗</a>}
        </div>
      )}
    </div>
  );
}

function StatusToggle({ value, onChange }) {
  return (
    <div className="st">
      <button className={value === "ok" ? "stb ok" : "stb"} onClick={() => onChange(value === "ok" ? null : "ok")}>Cumplido</button>
      <button className={value === "no" ? "stb no" : "stb"} onClick={() => onChange(value === "no" ? null : "no")}>No cumplido</button>
    </div>
  );
}

/* ---------- Vista: Hoy ---------- */

function Hoy({ date, setDate, type, win, data, up }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const dt = DAY_TYPES[type];
  const tg = TARGETS[dt.macro];
  const isTrain = ["torsoA", "torsoB", "acc"].includes(type);
  const session = isTrain ? SESSIONS[type] : null;
  const meals = data.meals[date] || {};
  const logs = data.logs[date] || {};
  const chk = (data.check && data.check[date]) || {};

  const setType = (v) => up((d) => { d.plan = { ...d.plan, [date]: v }; return d; });
  const setChk = (k, v) => up((d) => { const c = { ...(d.check || {}) }; c[date] = { ...(c[date] || {}), [k]: v }; d.check = c; return d; });
  const setMeal = (slot, v) => up((d) => { d.meals = { ...d.meals, [date]: { ...(d.meals[date] || {}), [slot]: v } }; return d; });
  const setLog = (exId, i, field, v) =>
    up((d) => {
      const day = { ...(d.logs[date] || {}) };
      const ex = { ...(day[exId] || { sets: [] }) };
      const sets = [...(ex.sets || [])];
      sets[i] = { ...(sets[i] || {}), [field]: v };
      ex.sets = sets;
      day[exId] = ex;
      d.logs = { ...d.logs, [date]: day };
      return d;
    });
  const toggleDone = (exId) =>
    up((d) => {
      const day = { ...(d.logs[date] || {}) };
      day[exId] = { ...(day[exId] || { sets: [] }), done: !(day[exId] && day[exId].done) };
      d.logs = { ...d.logs, [date]: day };
      return d;
    });

  const eaten = win.meals.reduce((acc, s, i) => {
    const key = meals["m" + i] === undefined ? s.def : meals["m" + i];
    if (!key || key === "none" || !meals["done_m" + i]) return acc;
    const m = RECIPES[key].m;
    return { kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g };
  }, { kcal: 0, p: 0, c: 0, g: 0 });

  return (
    <>
      <div className="datenav">
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">‹</button>
        <div><strong>{pretty(date)}</strong>{date === iso(new Date()) && <span className="chip">hoy</span>}</div>
        <button onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">›</button>
      </div>

      <FastBar now={now} win={win} />

      <section className="card">
        <label className="lbl">Qué toca este día</label>
        <select className="sel big" value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(DAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <p className="hint">Cámbialo cuando el fisio te reprograme. El objetivo calórico se ajusta solo.</p>
      </section>

      <section className="card">
        <div className="cardhd">
          <h2>{dt.macro === "entreno" ? "Objetivo de día de entreno" : "Objetivo de día de descanso"}</h2>
          <span className="num">{tg.kcal} kcal</span>
        </div>
        <div className="bars">
          <Bar l="Proteína" v={eaten.p} max={tg.p} u="g" tone="go" />
          <Bar l="Carbohidratos" v={eaten.c} max={tg.c} u="g" tone="warn" />
          <Bar l="Grasa" v={eaten.g} max={tg.g} u="g" tone="stop" />
        </div>
        <p className="hint">Llevas {eaten.kcal} kcal marcadas. La proteína es la única cifra que no se negocia: es lo que decide si pierdes grasa o músculo.</p>
      </section>

      <section className="card">
        <h2>Comidas</h2>
        {win.meals.map((s, i) => {
          const slot = "m" + i;
          const key = meals[slot] === undefined ? s.def : meals[slot];
          const done = !!meals["done_" + slot];
          return (
            <div className="meal" key={slot}>
              <div className="mealtop">
                <span className="lbl">{hhmm(s.t)} · {s.label}</span>
                <button className={done ? "check on" : "check"} onClick={() => setMeal("done_" + slot, !done)}>{done ? "Comida hecha" : "Marcar"}</button>
              </div>
              <select className="sel" value={key || "none"} onChange={(e) => setMeal(slot, e.target.value)}>
                <option value="none">— sin asignar —</option>
                {Object.entries(RECIPES).map(([k, r]) => <option key={k} value={k}>{r.n}</option>)}
              </select>
              {key && key !== "none" && (
                <div className="mmac">{RECIPES[key].m.kcal} kcal · P {RECIPES[key].m.p} · C {RECIPES[key].m.c} · G {RECIPES[key].m.g}</div>
              )}
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>Movilidad diaria</h2>
        <p className="hint" style={{ marginTop: 0 }}>Los dos únicos bloques que van todos los días, entrenes o no.</p>
        {["am", "pm"].map((b) => (
          <div className="mob" key={b}>
            <div>
              <div className="exn">{STRETCH[b].title}</div>
              <div className="exm">{STRETCH[b].dur} · {STRETCH[b].ex.filter((e) => chk[b + "_" + e.id]).length} de {STRETCH[b].ex.length} marcados</div>
            </div>
            <StatusToggle value={chk[b + "Done"]} onChange={(v) => setChk(b + "Done", v)} />
          </div>
        ))}
      </section>

      {session ? (
        <section className="card">
          <div className="cardhd">
            <h2>{session.title}</h2>
            <span className="num">{session.dur}</span>
          </div>
          <div className="mob" style={{ borderTop: 0, paddingTop: 0, marginTop: 0, marginBottom: 12 }}>
            <div className="lbl" style={{ margin: 0 }}>Sesión</div>
            <StatusToggle value={chk.sesion} onChange={(v) => setChk("sesion", v)} />
          </div>
          <p className="warm"><strong>Calentamiento.</strong> {session.warm}</p>
          {session.ex.map((ex) => {
            const log = logs[ex.id] || {};
            return (
              <div className={log.done ? "ex done" : "ex"} key={ex.id}>
                <div className="extop">
                  <button className={log.done ? "check on" : "check"} onClick={() => toggleDone(ex.id)} aria-label={ex.n}>{log.done ? "✓" : ""}</button>
                  <div>
                    <div className="exn">{ex.n}</div>
                    <div className="exm">{ex.ap > 0 ? `${ex.ap} aprox + ` : ""}{ex.s} × {ex.r}{ex.rir ? ` · RIR ${ex.rir}` : ""}</div>
                  </div>
                </div>
                <div className="sets">
                  {Array.from({ length: ex.s }).map((_, i) => (
                    <div className="set" key={i}>
                      <span>{i + 1}</span>
                      <input inputMode="decimal" placeholder="kg" value={(log.sets && log.sets[i] && log.sets[i].kg) || ""} onChange={(e) => setLog(ex.id, i, "kg", e.target.value)} />
                      <input inputMode="numeric" placeholder="reps" value={(log.sets && log.sets[i] && log.sets[i].reps) || ""} onChange={(e) => setLog(ex.id, i, "reps", e.target.value)} />
                    </div>
                  ))}
                </div>
                <Guide ex={ex} />
              </div>
            );
          })}
        </section>
      ) : (
        <section className="card">
          <h2>{dt.label}</h2>
          <p className="hint">
            {type === "fisio" && "Día de fisio. No añadas trabajo de cadera, psoas o pierna por tu cuenta: hoy esa cuota ya está cubierta. Camina y listo."}
            {type === "cardio" && "20–25 min de elíptica o caminata larga, respiración cómoda. Sin impacto, y sin bici si sentiste el psoas esta semana."}
            {type === "descanso" && "Descanso real. Apunta a 7 000–9 000 pasos y duerme 7–8 h: ahí es donde se construye el músculo que pagaste en el gimnasio."}
            {type === "ayuno24" && "Ayuno de 24 h. Que no caiga el día antes ni el día después de entrenar, ni cerca de fisio. Agua, sal y electrolitos. Máximo una vez al mes."}
          </p>
        </section>
      )}
    </>
  );
}

function FastBar({ now, win }) {
  const h = now.getHours() + now.getMinutes() / 60;
  const open = h >= win.start && h < win.end;
  const pos = (h / 24) * 100;
  const nextH = open ? win.end : h < win.start ? win.start : win.start + 24;
  const left = nextH - h;
  const hh = Math.floor(left);
  const mm = Math.round((left - hh) * 60);
  return (
    <section className="card fast">
      <div className="cardhd">
        <h2>{open ? "Ventana abierta" : "En ayuno"}</h2>
        <span className="num">{hh} h {mm} min {open ? "para cerrar" : "para abrir"}</span>
      </div>
      <div className="track">
        <div className="win" style={{ left: `${(win.start / 24) * 100}%`, width: `${((win.end - win.start) / 24) * 100}%` }} />
        <div className="mark" style={{ left: `${pos}%` }} />
      </div>
      <div className="ticks"><span>0</span><span>{hhmm(win.start)}</span><span>{hhmm(win.end)}</span><span>24</span></div>
      <p className="hint">{win.label}. Entrena dentro de la ventana o justo antes de romperla; con esta ventana eso significa mañana o mediodía.</p>
    </section>
  );
}

function Bar({ l, v, max, u, tone }) {
  const pct = Math.min(100, (v / max) * 100);
  return (
    <div className="barrow">
      <div className="barlbl"><span>{l}</span><span className="num">{v} / {max} {u}</span></div>
      <div className="bartrack"><div className="barfill" style={{ width: `${pct}%`, background: TONES[tone].c }} /></div>
    </div>
  );
}

/* ---------- Vista: Semana ---------- */

function Semana({ anchor, setDate, data, up, go }) {
  const [wk, setWk] = useState(() => mondayOf(anchor));
  const days = Array.from({ length: 7 }, (_, i) => addDays(wk, i));
  const setType = (d, v) => up((x) => { x.plan = { ...x.plan, [d]: v }; return x; });
  const counts = days.reduce((a, d) => {
    const t = data.plan[d] || defaultType(d);
    if (["torsoA", "torsoB", "acc"].includes(t)) a.train++;
    if (t === "fisio") a.fisio++;
    return a;
  }, { train: 0, fisio: 0 });

  return (
    <>
      <div className="datenav">
        <button onClick={() => setWk(addDays(wk, -7))} aria-label="Semana anterior">‹</button>
        <div><strong>{pretty(wk)} — {pretty(addDays(wk, 6))}</strong></div>
        <button onClick={() => setWk(addDays(wk, 7))} aria-label="Semana siguiente">›</button>
      </div>
      <section className="card">
        <p className="hint" style={{ marginTop: 0 }}>Reasigna cualquier día desde aquí. Regla dura: <strong>48 h entre sesiones de torso</strong>. Si el fisio te mueve un día, corre el entreno, no lo elimines.</p>
        {days.map((d) => {
          const t = data.plan[d] || defaultType(d);
          return (
            <div className="wrow" key={d}>
              <button className="wdate" onClick={() => { setDate(d); go(); }}>
                <span className="wdow">{DOW[parseIso(d).getDay()]}</span>
                <span className="wnum">{parseIso(d).getDate()}</span>
              </button>
              <select className="sel" value={t} onChange={(e) => setType(d, e.target.value)}>
                {Object.entries(DAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <span className="dot" style={{ background: TONES[DAY_TYPES[t].tone].c }} />
            </div>
          );
        })}
        <div className="wsum"><span>{counts.train} sesiones de gimnasio</span><span>{counts.fisio} de fisio</span></div>
        {counts.train < 3 && <p className="alert">Esta semana te faltan sesiones de gimnasio. Con 3 días progresas; con 2, mantienes.</p>}
      </section>
    </>
  );
}

/* ---------- Vista: Entrenos ---------- */

function Entrenos() {
  const [open, setOpen] = useState("torsoA");
  return (
    <>
      <section className="card">
        <h2>Series de aproximación</h2>
        <p className="hint" style={{ marginTop: 0 }}>Cinco ejercicios por sesión, pero las series efectivas van cerca del límite. La aproximación es lo que te permite eso sin lesionarte.</p>
        <ol className="steps">
          <li><strong>Primera aproximación:</strong> 50 % del peso de trabajo, 8 repeticiones suaves. Es para el tendón y el patrón de movimiento, no para el músculo.</li>
          <li><strong>Segunda aproximación:</strong> 70 %, 5 repeticiones. Solo en el primer ejercicio de la sesión.</li>
          <li><strong>Series efectivas:</strong> el peso real, en el rango indicado, con el RIR marcado. Descansa 2–3 min entre ellas: con solo 3 series efectivas, cortar el descanso te quita el estímulo.</li>
          <li><strong>RIR 2</strong> significa que al terminar la serie podrías haber hecho 2 repeticiones más. <strong>RIR 1</strong> es que te quedaba una. Nunca llegues al fallo con la lumbar en recuperación.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Progresión por semanas</h2>
        <ol className="steps">
          <li><strong>Semanas 1–2 · adaptar.</strong> RIR 3 en todo. Vas a sentir que es poco. Es a propósito: llevas tiempo fuera y hay cuatro estructuras en recuperación.</li>
          <li><strong>Semanas 3–6 · cargar.</strong> RIR 2, última serie RIR 1. Sube 2,5 kg o una repetición cuando completes todas las series en el rango alto. Un solo ajuste por ejercicio y por semana.</li>
          <li><strong>Semana 7 · descarga.</strong> Mismo peso, la mitad de las series. Aquí encaja el ayuno de 24 h si lo quieres probar.</li>
          <li><strong>Semana 8 · medir.</strong> Peso, % de grasa y cintura. Revisamos y pasamos al esquema con días de pierna si el fisio da el alta.</li>
        </ol>
      </section>

      {Object.entries(SESSIONS).map(([k, s]) => (
        <section className="card" key={k}>
          <button className="acc" onClick={() => setOpen(open === k ? "" : k)}>
            <span>{s.title}<span className="rect">{s.ex.length} ejercicios · {s.dur}</span></span>
            <span className="num">{open === k ? "−" : "+"}</span>
          </button>
          {open === k && (
            <div>
              <p className="warm"><strong>Calentamiento.</strong> {s.warm}</p>
              {s.ex.map((ex, i) => (
                <div className="exr" key={ex.id}>
                  <div className="exi">{i + 1}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="exn">{ex.n}</div>
                    <div className="exm">{ex.ap > 0 ? `${ex.ap} aprox + ` : ""}{ex.s} × {ex.r}{ex.rir ? ` · RIR ${ex.rir}` : ""}</div>
                    <Guide ex={ex} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <section className="card">
        <h2>Semáforo de restricciones</h2>
        <p className="hint" style={{ marginTop: 0 }}>Construido sobre tus cuatro lesiones. Léelo antes de improvisar un ejercicio nuevo.</p>
        {RESTRICTIONS.map((r, i) => (
          <div className="res" key={i} style={{ background: TONES[r.tone].bg, borderColor: TONES[r.tone].c }}>
            <div className="restop"><strong>{r.t}</strong><span className="tag" style={{ color: TONES[r.tone].c }}>{TONES[r.tone].l}</span></div>
            <p className="resd">{r.d}</p>
            <p className="resw">{r.why}</p>
          </div>
        ))}
      </section>
    </>
  );
}

/* ---------- Vista: Movilidad ---------- */

function Movilidad({ date, setDate, data, up }) {
  const [block, setBlock] = useState(() => (new Date().getHours() < 14 ? "am" : "pm"));
  const chk = (data.check && data.check[date]) || {};
  const setChk = (k, v) => up((d) => { const c = { ...(d.check || {}) }; c[date] = { ...(c[date] || {}), [k]: v }; d.check = c; return d; });
  const s = STRETCH[block];
  const allDone = () =>
    up((d) => {
      const patch = {};
      s.ex.forEach((e) => { patch[block + "_" + e.id] = true; });
      patch[block + "Done"] = "ok";
      const c = { ...(d.check || {}) };
      c[date] = { ...(c[date] || {}), ...patch };
      d.check = c;
      return d;
    });

  return (
    <>
      <div className="datenav">
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">‹</button>
        <div><strong>{pretty(date)}</strong>{date === iso(new Date()) && <span className="chip">hoy</span>}</div>
        <button onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">›</button>
      </div>

      <div className="seg">
        <button className={block === "am" ? "on" : ""} onClick={() => setBlock("am")}>Mañana</button>
        <button className={block === "pm" ? "on" : ""} onClick={() => setBlock("pm")}>Noche</button>
      </div>

      <section className="card">
        <div className="cardhd"><h2>{s.title}</h2><span className="num">{s.dur}</span></div>
        <p className="warm">{s.intro}</p>
        {s.ex.map((ex) => {
          const k = block + "_" + ex.id;
          const on = !!chk[k];
          return (
            <div className={on ? "ex done" : "ex"} key={ex.id}>
              <div className="extop">
                <button className={on ? "check on" : "check"} onClick={() => setChk(k, !on)} aria-label={ex.n}>{on ? "✓" : ""}</button>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="exn">{ex.n}</div>
                  <div className="exm">{ex.d}</div>
                  <Guide ex={ex} />
                </div>
              </div>
            </div>
          );
        })}
        <button className="btn ghost" onClick={allDone}>Marcar la rutina completa</button>
        <div className="mob" style={{ marginTop: 12 }}>
          <div className="lbl" style={{ margin: 0 }}>Estado del bloque</div>
          <StatusToggle value={chk[block + "Done"]} onChange={(v) => setChk(block + "Done", v)} />
        </div>
      </section>

      <section className="card">
        <h2>Estiramientos que no debes hacer</h2>
        <ul className="mic">{STRETCH_AVOID.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <p className="hint">Si un estiramiento te da hormigueo, corriente o dolor que baja por la pierna, no es tensión muscular: es nervio. Suspéndelo y dilo en fisioterapia.</p>
      </section>
    </>
  );
}

/* ---------- Vista: Comida ---------- */

function Comida({ win, data, up }) {
  const [open, setOpen] = useState("");
  return (
    <>
      <section className="card">
        <label className="lbl">Ventana de alimentación</label>
        <select className="sel big" value={data.win} onChange={(e) => up((d) => { d.win = e.target.value; return d; })}>
          {Object.entries(WINDOWS).map(([k, w]) => <option key={k} value={k}>{w.label}</option>)}
        </select>
        <p className="hint">{win.note}</p>
        <p className="hint"><strong>Regla que no cambia:</strong> la sesión de gimnasio va dentro de la ventana, o pegada a ella. Entrenar en la hora 14 de ayuno, con déficit y en recuperación, es la forma más rápida de perder el músculo que estás tratando de conservar.</p>
      </section>

      <section className="card">
        <h2>Objetivos</h2>
        <table className="tb">
          <thead><tr><th></th><th>Entreno</th><th>Descanso</th></tr></thead>
          <tbody>
            <tr><td>Calorías</td><td className="num">2 300</td><td className="num">1 850</td></tr>
            <tr><td>Proteína</td><td className="num">160 g</td><td className="num">160 g</td></tr>
            <tr><td>Carbohidratos</td><td className="num">255 g</td><td className="num">155 g</td></tr>
            <tr><td>Grasa</td><td className="num">70 g</td><td className="num">65 g</td></tr>
          </tbody>
        </table>
        <p className="hint">La proteína es fija (2,2 g por kg). Los carbohidratos son la palanca: suben el día que entrenas, bajan el día que no. La grasa casi no se mueve.</p>
        <p className="hint">Con ventana temprana, carga la mayor parte de los carbohidratos en la comida previa y posterior al entreno, y haz de la última comida la más alta en proteína: vas a pasar 16 h sin comer.</p>
      </section>

      <section className="card">
        <h2>Recetas</h2>
        {Object.entries(RECIPES).map(([k, r]) => (
          <div className="rec" key={k}>
            <button className="acc" onClick={() => setOpen(open === k ? "" : k)}>
              <span><span className="recn">{r.n}</span><span className="rect">{r.tag}</span></span>
              <span className="num">{open === k ? "−" : "+"}</span>
            </button>
            {open === k && (
              <div className="recb">
                <div className="mmac">{r.m.kcal} kcal · P {r.m.p} · C {r.m.c} · G {r.m.g}</div>
                <h3>Ingredientes</h3>
                <ul>{r.ing.map((x, i) => <li key={i}>{x}</li>)}</ul>
                <h3>Preparación</h3>
                <ol>{r.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
                <p className="note">{r.note}</p>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Micronutrientes: los tres que se te van a quedar cortos</h2>
        <ul className="mic">
          <li><strong>Calcio y vitamina D.</strong> Con edema óseo en recuperación importan más de lo normal. El yogur griego cubre buena parte del calcio; la vitamina D es difícil por comida y vale la pena medirla en tu próximo control.</li>
          <li><strong>Hierro y zinc.</strong> Vienen de la res magra y las lentejas. Acompaña las lentejas con vitamina C (limón, tomate, pimentón) y el hierro se absorbe mucho mejor.</li>
          <li><strong>Omega-3.</strong> Aquí tienes un hueco real: no comes pescado. Cúbrelo con nueces y semillas de calabaza, y considera un suplemento de aceite de algas o de pescado en cápsula, que no sabe a mar.</li>
        </ul>
        <p className="hint">Fibra: apunta a 30 g diarios; con lentejas, avena, papa y vegetales sales sin esfuerzo. Agua: 2,5–3 L, y súbela los días de ayuno largo.</p>
      </section>
    </>
  );
}

/* ---------- Vista: Mercado ---------- */

function Mercado({ data, up }) {
  const mk = data.market || {};
  const toggle = (k) => up((d) => { d.market = { ...(d.market || {}), [k]: !(d.market || {})[k] }; return d; });
  const reset = () => up((d) => { d.market = {}; return d; });
  const total = MARKET.reduce((a, c) => a + c.groups.reduce((b, g) => b + g.items.length, 0), 0);
  const done = Object.values(mk).filter(Boolean).length;

  return (
    <>
      <section className="card">
        <div className="cardhd"><h2>Lista de mercado</h2><span className="num">{done} de {total}</span></div>
        <p className="hint" style={{ marginTop: 0 }}>Cantidades calculadas sobre 2 300 kcal y 160 g de proteína al día, con las siete recetas rotando. Lo fresco se compra cada 15 días; la despensa, una vez al mes.</p>
        <button className="btn ghost" onClick={reset}>Vaciar marcas</button>
      </section>

      {MARKET.map((c) => (
        <section className="card" key={c.ciclo}>
          <div className="cardhd"><h2>{c.ciclo}</h2></div>
          <p className="hint" style={{ marginTop: 0 }}>{c.sub}</p>
          {c.groups.map((g) => (
            <div key={g.g}>
              <h3>{g.g}</h3>
              {g.items.map((it) => {
                const k = c.ciclo + "|" + it;
                const on = !!mk[k];
                return (
                  <button key={it} className={on ? "mitem on" : "mitem"} onClick={() => toggle(k)}>
                    <span className="mbox">{on ? "✓" : ""}</span><span>{it}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </section>
      ))}

      <section className="card">
        <h2>Cómo comprar sin desperdiciar</h2>
        <ul className="mic">
          <li>Divide el pollo y la carne en porciones de 150–180 g el mismo día que compras, y congela. Descongelar de a una evita que cocines de más.</li>
          <li>Compra la mitad de los aguacates maduros y la mitad verdes: los verdes te sirven para la segunda semana.</li>
          <li>Cocina arroz, lentejas y pechuga los domingos. Es la única hora de cocina que este plan realmente exige.</li>
          <li>El yogur griego es el gasto que más se dispara. Si aprieta, cambia una porción diaria por huevo, que da proteína más barata.</li>
        </ul>
      </section>
    </>
  );
}

/* ---------- Vista: Progreso ---------- */

function Progreso({ data, up }) {
  const [f, setF] = useState({ date: iso(new Date()), weight: "", bf: "", waist: "" });
  const rows = useMemo(() => [...(data.metrics || [])].sort((a, b) => (a.date < b.date ? -1 : 1)), [data.metrics]);

  const add = () => {
    if (!f.weight) return;
    up((d) => {
      const m = (d.metrics || []).filter((x) => x.date !== f.date);
      d.metrics = [...m, { date: f.date, weight: +f.weight, bf: f.bf ? +f.bf : null, waist: f.waist ? +f.waist : null }];
      return d;
    });
    setF({ ...f, weight: "", bf: "", waist: "" });
  };
  const del = (date) => up((d) => { d.metrics = (d.metrics || []).filter((x) => x.date !== date); return d; });

  const last = rows[rows.length - 1];
  const lean = last && last.bf ? (last.weight * (1 - last.bf / 100)).toFixed(1) : null;

  return (
    <>
      <section className="card">
        <h2>Dónde estás</h2>
        <div className="kpis">
          <div><span className="k">{last ? last.weight : "72,6"}</span><span className="ku">kg hoy</span></div>
          <div><span className="k">{last && last.bf ? last.bf : "17,5"}</span><span className="ku">% grasa</span></div>
          <div><span className="k">{lean || "59,9"}</span><span className="ku">kg magros</span></div>
        </div>
        <p className="hint">Objetivo: <strong>~69 kg con 13 % de grasa</strong> conservando los 60 kg magros, o ~70 kg si ganas algo de músculo. Son 3,5–4 kg de grasa, no de peso. Ritmo sano: 0,3–0,4 kg por semana, 12–16 semanas.</p>
        <p className="hint">Mide una vez por semana, el mismo día, en ayunas y después del baño. El día a día es ruido: agua, sodio y digestión mueven 1,5 kg sin que cambie nada real.</p>
      </section>

      <section className="card">
        <h2>Registrar medición</h2>
        <div className="form">
          <label>Fecha<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label>Peso (kg)<input inputMode="decimal" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} placeholder="72.6" /></label>
          <label>% grasa<input inputMode="decimal" value={f.bf} onChange={(e) => setF({ ...f, bf: e.target.value })} placeholder="17.5" /></label>
          <label>Cintura (cm)<input inputMode="decimal" value={f.waist} onChange={(e) => setF({ ...f, waist: e.target.value })} placeholder="82" /></label>
        </div>
        <button className="btn" onClick={add}>Guardar medición</button>
      </section>

      <Adherencia data={data} />

      <Backup data={data} up={up} />

      {rows.length > 1 && <Chart rows={rows} />}

      <section className="card">
        <h2>Historial</h2>
        {rows.length === 0 ? (
          <p className="hint">Sin mediciones todavía. Registra la de esta semana para tener punto de partida.</p>
        ) : (
          <table className="tb">
            <thead><tr><th>Fecha</th><th>Peso</th><th>% grasa</th><th>Cintura</th><th></th></tr></thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.date}>
                  <td>{pretty(r.date)}</td>
                  <td className="num">{r.weight}</td>
                  <td className="num">{r.bf === null ? "—" : r.bf}</td>
                  <td className="num">{r.waist === null ? "—" : r.waist}</td>
                  <td><button className="x" onClick={() => del(r.date)} aria-label="Borrar">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Adherencia({ data }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(iso(new Date()), i - 13));
  const check = data.check || {};
  const plan = data.plan || {};
  const trainDays = days.filter((d) => ["torsoA", "torsoB", "acc"].includes(plan[d] || defaultType(d)));
  const okAm = days.filter((d) => (check[d] || {}).amDone === "ok").length;
  const okPm = days.filter((d) => (check[d] || {}).pmDone === "ok").length;
  const okSes = trainDays.filter((d) => (check[d] || {}).sesion === "ok").length;
  const pctMov = Math.round(((okAm + okPm) / 28) * 100);

  return (
    <section className="card">
      <div className="cardhd"><h2>Adherencia</h2><span className="num">últimos 14 días</span></div>
      <div className="bars">
        <Bar l="Movilidad mañana" v={okAm} max={14} u="días" tone="go" />
        <Bar l="Movilidad noche" v={okPm} max={14} u="días" tone="warn" />
        <Bar l="Sesiones de gimnasio" v={okSes} max={trainDays.length || 1} u="días" tone="stop" />
      </div>
      <div className="grid14">
        {days.map((d) => {
          const c = check[d] || {};
          const done = [c.amDone === "ok", c.pmDone === "ok", c.sesion === "ok"].filter(Boolean).length;
          const failed = [c.amDone === "no", c.pmDone === "no", c.sesion === "no"].some(Boolean);
          return <div key={d} className="cell" title={pretty(d)} style={{ background: done >= 2 ? "var(--go)" : done === 1 ? "var(--go-bg)" : failed ? "var(--stop-bg)" : "var(--surface2)" }} />;
        })}
      </div>
      <p className="hint">Marca cada día, incluso el que no cumples. Un "no cumplido" honesto vale más que un vacío: sobre 14 días vas a ver si lo que falla es la rutina de la noche, el gimnasio del viernes o el plan completo. Vas en {pctMov} % de adherencia en movilidad.</p>
    </section>
  );
}

function Chart({ rows }) {
  const W = 320, H = 150, P = 28;
  const ws = rows.map((r) => r.weight);
  const min = Math.min(...ws, 68) - 0.5;
  const max = Math.max(...ws) + 0.5;
  const x = (i) => P + (i / (rows.length - 1)) * (W - P * 2);
  const y = (v) => H - P - ((v - min) / (max - min)) * (H - P * 2);
  const path = rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.weight)}`).join(" ");
  const ty = y(69);

  return (
    <section className="card">
      <h2>Tendencia de peso</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Gráfica de peso">
        <line x1={P} y1={ty} x2={W - P} y2={ty} stroke="var(--go)" strokeDasharray="4 3" strokeWidth="1" />
        <text x={W - P} y={ty - 5} textAnchor="end" className="ctext">meta 69 kg</text>
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
        {rows.map((r, i) => <circle key={r.date} cx={x(i)} cy={y(r.weight)} r="3" fill="var(--ink)" />)}
        <text x={P} y={H - 8} className="ctext">{pretty(rows[0].date)}</text>
        <text x={W - P} y={H - 8} textAnchor="end" className="ctext">{pretty(rows[rows.length - 1].date)}</text>
      </svg>
      <p className="hint">Si en 3 semanas la línea no baja, recorta 150 kcal de carbohidratos en los días de descanso. Si baja más de 0,5 kg por semana, súbelas: a ese ritmo parte de lo que pierdes es músculo.</p>
    </section>
  );
}

/* ---------- Estilos ---------- */

function Style() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root{
  --ink:#16232B; --surface:#EFF1EE; --surface2:#E4E8E4; --card:#FFFFFF;
  --line:#D5DAD5; --muted:#6E7F86;
  --go:#1F6F63; --go-bg:#E8F1EE;
  --warn:#B4711A; --warn-bg:#F8EEDF;
  --stop:#9E3B33; --stop-bg:#F7E9E7;
  --sans:'Archivo',system-ui,-apple-system,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,'SF Mono',monospace;
}
*{box-sizing:border-box}
.app{font-family:var(--sans);background:var(--surface);color:var(--ink);min-height:100vh;padding:14px;max-width:560px;margin:0 auto;-webkit-font-smoothing:antialiased}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}
.hd h1{font-size:26px;line-height:1;margin:2px 0 0;letter-spacing:-.02em;font-weight:700}
.eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.save{font-family:var(--mono);font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:3px 8px;white-space:nowrap}
.save[data-s="error"]{color:var(--stop);border-color:var(--stop)}
.tabs{display:flex;gap:4px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{font-family:var(--sans);font-size:13px;font-weight:600;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:99px;padding:7px 13px;white-space:nowrap;cursor:pointer}
.tab.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.tab:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid var(--go);outline-offset:2px}
.datenav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.datenav>div{font-size:15px;display:flex;align-items:center;gap:8px}
.datenav button{width:36px;height:36px;border-radius:99px;border:1px solid var(--line);background:var(--card);font-size:18px;color:var(--ink);cursor:pointer;line-height:1}
.chip{font-family:var(--mono);font-size:9px;text-transform:uppercase;letter-spacing:.08em;background:var(--ink);color:#fff;border-radius:99px;padding:2px 6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:10px}
.card h2{font-size:15px;margin:0 0 8px;letter-spacing:-.01em}
.card h3{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin:14px 0 5px}
.cardhd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}
.cardhd h2{margin:0}
.num{font-family:var(--mono);font-size:12px;color:var(--muted);white-space:nowrap}
.lbl{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);display:block;margin-bottom:5px}
.hint{font-size:12.5px;line-height:1.55;color:var(--muted);margin:8px 0 0}
.sel{width:100%;font-family:var(--sans);font-size:14px;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);appearance:none}
.sel.big{font-size:16px;font-weight:600}
.fast .track{position:relative;height:12px;background:var(--surface2);border-radius:99px;overflow:hidden}
.fast .win{position:absolute;top:0;bottom:0;background:var(--go);opacity:.85}
.fast .mark{position:absolute;top:-3px;width:2px;height:18px;background:var(--ink)}
.ticks{display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;color:var(--muted);margin-top:4px}
.bars{display:flex;flex-direction:column;gap:9px}
.barlbl{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px}
.bartrack{height:7px;background:var(--surface2);border-radius:99px;overflow:hidden}
.barfill{height:100%;border-radius:99px;transition:width .3s}
.meal{border-top:1px solid var(--line);padding-top:10px;margin-top:10px}
.meal:first-of-type{border-top:0;padding-top:0;margin-top:0}
.mealtop{display:flex;justify-content:space-between;align-items:center;gap:8px}
.mealtop .lbl{margin:0}
.mmac{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:5px}
.check{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:99px;padding:4px 9px;cursor:pointer}
.check.on{background:var(--go);border-color:var(--go);color:#fff}
.warm{font-size:12.5px;line-height:1.55;background:var(--surface);border-radius:8px;padding:9px 10px;margin:0 0 10px;color:var(--ink)}
.ex{border-top:1px solid var(--line);padding:11px 0 3px}
.ex.done{opacity:.55}
.extop{display:flex;gap:9px;align-items:flex-start}
.extop .check{width:26px;height:26px;padding:0;flex:0 0 26px;font-size:13px}
.exn{font-size:14px;font-weight:600;line-height:1.25}
.exm{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:2px}
.sets{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 0 35px}
.set{display:flex;align-items:center;gap:3px}
.set span{font-family:var(--mono);font-size:9px;color:var(--muted);width:9px}
.set input{width:46px;font-family:var(--mono);font-size:12px;padding:5px 4px;border:1px solid var(--line);border-radius:6px;text-align:center;background:var(--card);color:var(--ink)}
.exr{display:flex;gap:10px;border-top:1px solid var(--line);padding:11px 0}
.exi{font-family:var(--mono);font-size:11px;color:var(--muted);flex:0 0 16px;padding-top:2px}
.guide{margin-top:7px}
.glink{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.07em;background:transparent;border:1px solid var(--line);border-radius:99px;padding:4px 10px;color:var(--ink);cursor:pointer}
.gbody{margin-top:9px;background:var(--surface);border-radius:8px;padding:11px 12px}
.gbody ol{margin:0;padding-left:17px}
.gbody li{font-size:12.5px;line-height:1.6;margin-bottom:7px}
.gbody li:last-child{margin-bottom:0}
.gbody>p{font-size:12.5px;line-height:1.6;margin:0}
.gerr{font-size:12px;line-height:1.55;color:var(--stop);background:var(--stop-bg);border-radius:6px;padding:8px 9px;margin:9px 0 0!important}
.gyt{display:inline-block;margin-top:9px;font-family:var(--mono);font-size:10.5px;color:var(--go);text-decoration:none;border-bottom:1px solid var(--go)}
.acc{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;background:transparent;border:0;padding:9px 0;font-family:var(--sans);font-size:14px;font-weight:600;color:var(--ink);text-align:left;cursor:pointer}
.rec{border-top:1px solid var(--line)}
.rec:first-of-type{border-top:0}
.recn{display:block}
.rect{display:block;font-family:var(--mono);font-size:10px;font-weight:400;color:var(--muted);margin-top:2px}
.recb{padding-bottom:10px}
.recb ul,.recb ol{margin:0;padding-left:18px}
.recb li{font-size:13px;line-height:1.55;margin-bottom:4px}
.note{font-size:12px;line-height:1.55;color:var(--go);background:var(--go-bg);border-radius:8px;padding:9px 10px;margin:10px 0 0}
.res{border:1px solid;border-radius:10px;padding:10px 11px;margin-bottom:7px}
.restop{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:13.5px}
.tag{font-family:var(--mono);font-size:9px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.resd{font-size:12.5px;line-height:1.5;margin:5px 0 0}
.resw{font-size:12px;line-height:1.5;color:var(--muted);margin:5px 0 0}
.steps{margin:0;padding-left:18px}
.steps li{font-size:13px;line-height:1.55;margin-bottom:8px}
.wrow{display:flex;align-items:center;gap:8px;border-top:1px solid var(--line);padding:8px 0}
.wrow:first-of-type{border-top:0}
.wdate{flex:0 0 42px;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:5px 0;cursor:pointer;display:flex;flex-direction:column;align-items:center;color:var(--ink)}
.wdow{font-family:var(--mono);font-size:9px;color:var(--muted);text-transform:uppercase}
.wnum{font-size:15px;font-weight:600;line-height:1.1}
.dot{width:8px;height:8px;border-radius:99px;flex:0 0 8px}
.wsum{display:flex;gap:14px;font-family:var(--mono);font-size:11px;color:var(--muted);border-top:1px solid var(--line);margin-top:10px;padding-top:9px}
.alert{font-size:12.5px;line-height:1.5;color:var(--warn);background:var(--warn-bg);border-radius:8px;padding:9px 10px;margin:9px 0 0}
.tb{width:100%;border-collapse:collapse;font-size:13px}
.tb th{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);text-align:right;font-weight:400;padding:0 0 5px}
.tb th:first-child{text-align:left}
.tb td{padding:6px 0;border-top:1px solid var(--line);text-align:right}
.tb td:first-child{text-align:left}
.kpis{display:flex;gap:8px}
.kpis>div{flex:1;background:var(--surface);border-radius:10px;padding:10px 8px;text-align:center}
.k{display:block;font-family:var(--mono);font-size:20px;font-weight:500;letter-spacing:-.02em}
.ku{display:block;font-family:var(--mono);font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-top:2px}
.form{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.form label{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:flex;flex-direction:column;gap:4px}
.form input{font-family:var(--mono);font-size:14px;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);width:100%}
.btn{margin-top:10px;width:100%;background:var(--ink);color:#fff;border:0;border-radius:8px;padding:11px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.x{background:transparent;border:0;color:var(--muted);font-size:16px;cursor:pointer;padding:0 4px}
.chart{width:100%;height:auto;display:block}
.ctext{font-family:var(--mono);font-size:8px;fill:var(--muted)}
.seg{display:flex;gap:4px;background:var(--surface2);border-radius:99px;padding:3px;margin-bottom:10px}
.seg button{flex:1;border:0;background:transparent;font-family:var(--sans);font-size:13px;font-weight:600;color:var(--muted);padding:8px;border-radius:99px;cursor:pointer}
.seg button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(22,35,43,.1)}
.mob{border-top:1px solid var(--line);padding-top:10px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.st{display:flex;gap:4px;flex-shrink:0}
.stb{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:99px;padding:5px 9px;cursor:pointer;white-space:nowrap}
.stb.ok{background:var(--go);border-color:var(--go);color:#fff}
.stb.no{background:var(--stop);border-color:var(--stop);color:#fff}
.grid14{display:grid;grid-template-columns:repeat(14,1fr);gap:3px;margin-top:12px}
.cell{aspect-ratio:1;border-radius:3px}
.mitem{display:flex;align-items:center;gap:9px;width:100%;background:transparent;border:0;border-top:1px solid var(--line);padding:9px 0;font-family:var(--sans);font-size:13px;color:var(--ink);text-align:left;cursor:pointer;line-height:1.35}
.mitem.on{color:var(--muted);text-decoration:line-through}
.mbox{flex:0 0 20px;height:20px;border:1px solid var(--line);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff}
.mitem.on .mbox{background:var(--go);border-color:var(--go)}
.mic{margin:0;padding-left:18px}
.mic li{font-size:13px;line-height:1.55;margin-bottom:8px}
.ft{font-size:11.5px;line-height:1.5;color:var(--muted);text-align:center;padding:6px 8px 20px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`}</style>
  );
}

/* ---------- Copia de seguridad ---------- */

function Backup({ data, up }) {
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  const exportar = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-${iso(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg("Archivo descargado.");
    } catch (e) {
      setMsg("No se pudo descargar. Prueba desde el navegador, no desde una app embebida.");
    }
  };

  const importar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const raw = JSON.parse(r.result);
        if (!raw || typeof raw !== "object") throw new Error("formato");
        up(() => ({ plan: {}, logs: {}, meals: {}, metrics: [], check: {}, market: {}, win: "temprano", ...raw }));
        setMsg("Datos restaurados desde el archivo.");
      } catch (err) {
        setMsg("Ese archivo no tiene el formato correcto. Usa uno exportado desde aquí.");
      }
    };
    r.readAsText(file);
    e.target.value = "";
  };

  return (
    <section className="card">
      <h2>Copia de seguridad</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Tus registros viven solo en este navegador. Si borras los datos del sitio, cambias de celular o quieres verlos en el computador, exporta el archivo y vuelve a cargarlo allá. Hazlo una vez al mes.
      </p>
      <button className="btn" onClick={exportar}>Exportar mis datos</button>
      <button className="btn ghost" onClick={() => fileRef.current && fileRef.current.click()}>Importar desde archivo</button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={importar} style={{ display: "none" }} />
      {msg && <p className="note">{msg}</p>}
    </section>
  );
}

/* ---------- Montaje ---------- */

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
