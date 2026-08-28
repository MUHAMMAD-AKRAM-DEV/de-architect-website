/* Everything the chat assistant says, in English.
   ---------------------------------------------------------------------------
   Kept apart from the logic so tools/i18n-data.mjs can pull these into the
   same dictionary as the rest of the site, and so the wording can be changed
   without going near the matching code.

   Most of what the assistant actually answers with is not here — it quotes the
   site's own copy (the FAQs, the service names, the opening hours), which is
   already translated. These are only the joins between those answers. */
window.DE_CHAT_COPY = {
  /* --- the frame --- */
  launcher:  'Chat with the studio',
  close:     'Close chat',
  title:     'Studio assistant',
  status:    'Answers instantly · a person replies within two working days',
  field:     'Ask about fees, timescales, or a project…',
  send:      'Send',
  restart:   'Start over',

  /* --- opening --- */
  morning:   'Good morning.',
  afternoon: 'Good afternoon.',
  evening:   'Good evening.',
  opener:    'I can answer most things about how we work — fees, timescales, what we do. What would you like to know?',
  onProject: 'You are looking at one of our projects — happy to talk about that one, or anything else.',
  onServices:'You are on the services page — ask me about any of the six, or about fees.',
  onContact: 'If you would rather just write to us, the form on this page reaches the studio directly.',

  /* --- quick replies --- */
  qFees:     'What do you charge?',
  qTime:     'How long does it take?',
  qWhat:     'What do you do?',
  qStart:    'I want to start a project',
  qWork:     'Can I see your work?',
  qWhere:    'Where are you?',

  /* --- joins --- */
  onFees:    'On fees:',
  onTime:    'On timescales:',
  weCover:   'We cover six things:',
  alsoAsk:   'Fees and timescales are the two most common questions — ask me either.',
  reachUs:   'You can reach the studio directly:',
  ourHours:  'The studio is open:',
  bothPlaces:'There are two studios:',
  tourList:  'A few of these can be walked through in 3D, right in the browser:',
  seeAll:    'All of them are on the projects page.',
  toContact: 'The contact page has a short form — tell us what you are thinking of and one of us will reply.',
  anythingElse: 'Anything else I can help with?',

  /* --- button labels: an action the visitor takes, not a line they say --- */
  goContact: 'Contact the studio',
  goProjects:'See the projects',
  goServices:'See the services',
  goStudio:  'Look inside the studio',

  /* --- being straight about what this is --- */
  notHuman:  'I should say — I am the studio assistant, not one of the architects. I can answer the common questions, and put you in touch with a person whenever you want.',
  handOff:   'That one is better answered by a person. The quickest way is the contact form, or WhatsApp if you prefer.',

  /* --- talking about one project --- */
  thatOne:   'Here is that one:',
  hasTour:   'That one has a 3D tour you can walk through in the browser.',
  moreOnIt:  'The project page has the full story and the photographs.',

  /* --- when it does not know --- */
  unsure:    'I am not certain I have a good answer for that.',
  tryThese:  'Try me on fees, timescales, our services, how a project runs, or where we are.',
  aPersonWill: 'A person will answer it properly though — the studio replies to every enquiry within two working days, and there is a WhatsApp button in the corner if that is quicker.',

  /* --- small talk --- */
  thanks:    'You are very welcome.',
  bye:       'Thanks for stopping by — good luck with the project.',
  niceName:  'Good to meet you.',

  /* --- when a live service is wired up but fails --- */
  offline:   'I could not reach the studio just now. The contact form is the reliable route.'
};
