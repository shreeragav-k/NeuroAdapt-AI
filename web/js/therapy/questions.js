// The seven spoken-conversation questions of the virtual therapist (Dr. Sarah), in English, Hindi and Tamil.
// Taken unchanged from the PediaSense therapist session. Each question has the domain it observes, the prompt the
// therapist says, what is looked at (criteria) and a strength / practice note used in the report.
export const QUESTIONS_I18N = {
    en: [
      {
        id: 'comm_1',
        domain: 'Communication',
        title: 'Weekend Experiences & Storytelling',
        text: "Hello! I'm Dr. Sarah, your virtual therapist. I'm so excited to chat with you today! Can you tell me what your favorite thing to do on weekends is, and why you love it?",
        criteria: 'Verbal expression, sentence structure, sharing personal experiences.',
        sampleStrength: 'Expresses thoughts with clear sentence structure and descriptive vocabulary.',
        samplePractice: 'Encourage elaboration with gentle follow-up questions ("What happened next?").'
      },
      {
        id: 'mem_2',
        domain: 'Memory',
        title: 'Sequential Recall & Recent Events',
        text: "I love hearing about your day! Can you remember what you had for breakfast this morning, or tell me about a fun game you played recently?",
        criteria: 'Short-term and episodic memory recall, sequential recall.',
        sampleStrength: 'Accurately recalls recent details and events in logical order.',
        samplePractice: 'Practice daily memory recall through dinner conversation and picture books.'
      },
      {
        id: 'att_3',
        domain: 'Attention',
        title: 'Auditory Focus & Reasoning',
        text: "Listen closely to this fun riddle: A tiny green frog hops over two big rocks and lands right in a blue pond! Where did the little frog land?",
        targetKeywords: ['pond', 'water', 'blue pond'],
        criteria: 'Auditory focus, tracking details in a brief verbal sequence.',
        sampleStrength: 'Demonstrates active listening and successfully captures key story details.',
        samplePractice: 'Incorporate 2-step listening games like "Simon Says" or rhyming riddles.'
      },
      {
        id: 'prob_4',
        domain: 'Problem Solving',
        title: 'Structural Reasoning & Creativity',
        text: "Imagine you are building a tall toy tower with blocks, but the top piece keeps wobbling and falling off! What could you do to help it stay strong and balanced?",
        criteria: 'Cause-and-effect reasoning, practical problem-solving strategies.',
        sampleStrength: 'Offers constructive, flexible problem-solving ideas for stability.',
        samplePractice: 'Engage in open-ended building challenges with blocks or household items.'
      },
      {
        id: 'emo_5',
        domain: 'Emotional Expression',
        title: 'Affect & Self-Regulation',
        text: "We all experience different feelings throughout the day! When you feel super happy or excited, what do you like to do? And what helps you feel cozy when you feel tired or upset?",
        criteria: 'Emotion recognition, emotional vocabulary, coping strategies.',
        sampleStrength: 'Identifies emotional states and recognizes calming comfort strategies.',
        samplePractice: 'Use emotion cards or storybook characters to talk about feelings together.'
      },
      {
        id: 'soc_6',
        domain: 'Social Interaction',
        title: 'Prosocial Empathy & Inclusivity',
        text: "If you saw a classmate sitting all by themselves on the playground looking a little lonely, what might you say or do to help them feel included?",
        criteria: 'Empathy, prosocial intent, perspective-taking.',
        sampleStrength: 'Demonstrates empathy, warmth, and friendly inclusive social ideas.',
        samplePractice: 'Practice cooperative play and role-playing social greeting scenarios.'
      },
      {
        id: 'cre_7',
        domain: 'Creativity',
        title: 'Imaginative Elaboration',
        text: "If you could invent any magical animal or gadget in the whole universe, what would it look like and what special superpower would it have?",
        criteria: 'Imagination, narrative originality, creative elaboration.',
        sampleStrength: 'Rich creative imagination with vivid descriptive details.',
        samplePractice: 'Inspire imaginative storytelling and drawing imaginary creatures.'
      }
    ],
    hi: [
      {
        id: 'comm_1',
        domain: 'Communication',
        title: 'सप्ताहांत के अनुभव और कहानियाँ',
        text: "नमस्ते! मैं डॉ. सारा, आपकी वर्चुअल थेरेपिस्ट हूँ। आज आपसे बात करके मुझे बहुत खुशी हो रही है! क्या आप मुझे बता सकते हैं कि छुट्टियों में आपको सबसे ज्यादा क्या करना पसंद है, और क्यों?",
        criteria: 'मौखिक अभिव्यक्ति, वाक्य संरचना और अनुभव साझाकरण का अवलोकन।',
        sampleStrength: 'स्पष्ट वाक्य संरचना और वर्णनात्मक शब्दों में विचार व्यक्त करता है।',
        samplePractice: 'हल्के अनुवर्ती प्रश्नों से विस्तार को प्रोत्साहित करें ("इसके बाद क्या हुआ?")।'
      },
      {
        id: 'mem_2',
        domain: 'Memory',
        title: 'क्रमिक स्मरण और हाल के अनुभव',
        text: "मुझे आपके बारे में जानना अच्छा लगता है! क्या आपको याद है कि आज सुबह आपने नाश्ते में क्या खाया था, या हाल ही में कोई मजेदार खेल खेला?",
        criteria: 'अल्पकालिक और घटनाक्रम-संबंधी स्मृति का अवलोकन।',
        sampleStrength: 'हाल की घटनाओं को तार्किक क्रम में सही ढंग से याद करता है।',
        samplePractice: 'रात के खाने की बातचीत और चित्रकथाओं के माध्यम से रोजाना याददाश्त का अभ्यास करें।'
      },
      {
        id: 'att_3',
        domain: 'Attention',
        title: 'सुनने की एकाग्रता और पहेली',
        text: "इस मजेदार पहेली को ध्यान से सुनिए: एक छोटा हरा मेंढक दो बड़े पत्थरों के ऊपर से कूदकर सीधे एक नीले तालाब में जा गिरा! वह नन्हा मेंढक कहाँ गिरा?",
        targetKeywords: ['तालाब', 'नीला तालाब', 'पानी', 'pond'],
        criteria: 'श्रवण ध्यान और संक्षिप्त कथा में विवरण का पालन करना।',
        sampleStrength: 'सक्रिय रूप से सुनता है और कहानी के मुख्य विवरण सफलतापूर्वक पकड़ता है।',
        samplePractice: '"Simon Says" जैसे 2-चरणीय श्रवण खेल शामिल करें।'
      },
      {
        id: 'prob_4',
        domain: 'Problem Solving',
        title: 'संरचनात्मक तर्क और रचनात्मकता',
        text: "कल्पना करें कि आप ब्लॉक्स से एक ऊँचा खिलौना टावर बना रहे हैं, लेकिन ऊपर का टुकड़ा बार-बार डगमगाता और गिरता है! उसे मजबूत और संतुलित रखने के लिए आप क्या करेंगे?",
        criteria: 'कारण-और-प्रभाव तर्क और व्यावहारिक समस्या-समाधान की रणनीतियाँ।',
        sampleStrength: 'स्थिरता के लिए रचनात्मक और लचीले समाधान प्रस्तुत करता है।',
        samplePractice: 'ब्लॉक्स या घरेलू वस्तुओं से खुले निर्माण चुनौतियों में शामिल करें।'
      },
      {
        id: 'emo_5',
        domain: 'Emotional Expression',
        title: 'भावनाएं और स्व-नियंत्रण',
        text: "हम सभी दिन भर अलग-अलग भावनाएं अनुभव करते हैं! जब आप बहुत खुश या उत्साहित होते हैं, तो आपको क्या करना पसंद है? और जब थके हुए या परेशान होते हैं तो क्या आपको आरामदायक लगता है?",
        criteria: 'भावना की पहचान, भावनात्मक शब्दावली और सामना करने की रणनीतियाँ।',
        sampleStrength: 'भावनात्मक स्थितियों को पहचानता है और शांत करने की रणनीतियों को जानता है।',
        samplePractice: 'भावना कार्ड या कहानी पात्रों का उपयोग करके भावनाओं के बारे में बात करें।'
      },
      {
        id: 'soc_6',
        domain: 'Social Interaction',
        title: 'सामाजिक सहानुभूति और समावेशिता',
        text: "अगर आपने देखा कि एक सहपाठी मैदान में अकेला बैठा है और थोड़ा उदास लग रहा है, तो आप उसे शामिल महसूस कराने के लिए क्या कहेंगे या करेंगे?",
        criteria: 'सहानुभूति, सामाजिक इरादा और दूसरे के दृष्टिकोण को समझना।',
        sampleStrength: 'सहानुभूति, गर्मजोशी और समावेशी सामाजिक विचार प्रदर्शित करता है।',
        samplePractice: 'सहकारी खेल और सामाजिक अभिवादन का अभ्यास करें।'
      },
      {
        id: 'cre_7',
        domain: 'Creativity',
        title: 'कल्पनाशील विस्तार',
        text: "अगर आप पूरे ब्रह्मांड में कोई भी जादुई जानवर या गैजेट बना सकते, तो वह कैसा दिखता और उसकी खास महाशक्ति क्या होती?",
        criteria: 'कल्पनाशीलता, कथा मौलिकता और रचनात्मक विस्तार।',
        sampleStrength: 'जीवंत वर्णनात्मक विवरण के साथ समृद्ध रचनात्मक कल्पना।',
        samplePractice: 'कल्पनाशील कहानी सुनाना और काल्पनिक प्राणियों को खींचने के लिए प्रेरित करें।'
      }
    ],
    ta: [
      {
        id: 'comm_1',
        domain: 'Communication',
        title: 'வார இறுதி அனுபவங்கள் மற்றும் கதைகள்',
        text: "வணக்கம்! நான் டாக்டர் சாரா, உங்கள் மெய்நிகர் சிகிச்சையாளர். இன்று உங்களிடம் பேசுவதில் மிகவும் மகிழ்ச்சி! வார இறுதியில் உங்களுக்கு மிகவும் பிடித்த செயல் என்ன, ஏன் என்று சொல்ல முடியுமா?",
        criteria: 'வாய்மொழி வெளிப்பாடு, வாக்கிய அமைப்பு மற்றும் அனுபவப் பகிர்வை கவனித்தல்.',
        sampleStrength: 'தெளிவான வாக்கிய அமைப்பு மற்றும் விளக்கமான சொற்களில் கருத்துக்களை வெளிப்படுத்துகிறார்.',
        samplePractice: 'மென்மையான கேள்விகள் மூலம் விரிவான பதில்களை ஊக்குவிக்கவும் ("பிறகு என்ன நடந்தது?").'
      },
      {
        id: 'mem_2',
        domain: 'Memory',
        title: 'வரிசை நினைவு மற்றும் சமீபத்திய நிகழ்வுகள்',
        text: "உங்கள் நாளைப் பற்றி கேட்பதில் எனக்கு மிக்க மகிழ்ச்சி! இன்று காலை நீங்கள் என்ன சாப்பிட்டீர்கள் என்று ஞாபகம் இருக்கிறதா, அல்லது சமீபத்தில் விளையாடிய விளையாட்டை பற்றி சொல்லுங்கள்?",
        criteria: 'குறுகிய கால மற்றும் நிகழ்வு சார்ந்த நினைவாற்றலை கவனித்தல்.',
        sampleStrength: 'சமீபத்திய நிகழ்வுகளை தர்க்கரீதியான வரிசையில் சரியாக நினைவுகூர்கிறார்.',
        samplePractice: 'இரவு உணவு உரையாடல் மற்றும் படக் கதைகள் மூலம் தினசரி நினைவு திறனை பயிற்றுவிக்கவும்.'
      },
      {
        id: 'att_3',
        domain: 'Attention',
        title: 'செவிவழி கவனம் மற்றும் புதிர்',
        text: "இந்த வேடிக்கையான விடுகதையை கவனமாகக் கேளுங்கள்: ஒரு சிறிய பச்சை தவளை இரண்டு பெரிய பாறைகளைத் தாண்டி நேராக ஒரு நீலக் குளத்தில் குதித்தது! அந்தச் சிறிய தவளை எங்கே விழுந்தது?",
        targetKeywords: ['குளம்', 'நீலக் குளம்', 'தண்ணீர்', 'நீலம்', 'pond'],
        criteria: 'செவிவழி கவனம் மற்றும் கதையிலுள்ள விவரங்களை கண்காணித்தல்.',
        sampleStrength: 'சுறுசுறுப்பாகக் கேட்டு கதையின் முக்கிய விவரங்களை வெற்றிகரமாகப் பிடிக்கிறார்.',
        samplePractice: '"Simon Says" போன்ற 2-படி செவிவழி விளையாட்டுகளை சேர்க்கவும்.'
      },
      {
        id: 'prob_4',
        domain: 'Problem Solving',
        title: 'கட்டமைப்பு சிந்தனை மற்றும் படைப்பாற்றல்',
        text: "நீங்கள் கட்டைகளால் ஒரு உயரமான விளையாட்டு கோபுரம் கட்டுகிறீர்கள் என்று கற்பனை செய்யுங்கள், ஆனால் மேல் பகுதி தொடர்ந்து ஆடி விழுகிறது! அது வலுவாகவும் சமநிலையாகவும் இருக்க நீங்கள் என்ன செய்வீர்கள்?",
        criteria: 'காரண-காரிய சிந்தனை மற்றும் நடைமுறை சிக்கல் தீர்க்கும் உத்திகள்.',
        sampleStrength: 'நிலைப்புத்தன்மைக்கு ஆக்கப்பூர்வமான மற்றும் நெகிழ்வான தீர்வுகளை வழங்குகிறார்.',
        samplePractice: 'கட்டைகள் அல்லது வீட்டு பொருட்களால் திறந்த-முடிவு கட்டுமான சவால்களில் ஈடுபடுங்கள்.'
      },
      {
        id: 'emo_5',
        domain: 'Emotional Expression',
        title: 'உணர்வுகள் மற்றும் சுய-கட்டுப்பாடு',
        text: "நாம் அனைவரும் நாள் முழுவதும் வெவ்வேறு உணர்வுகளை அனுபவிக்கிறோம்! நீங்கள் மிகவும் மகிழ்ச்சியாக இருக்கும்போது என்ன செய்ய விரும்புவீர்கள்? சோர்வாக அல்லது வருத்தமாக இருக்கும்போது என்ன உங்களுக்கு ஆறுதலாக இருக்கும்?",
        criteria: 'உணர்வு அடையாளம், உணர்வு சொற்களஞ்சியம் மற்றும் சமாளிக்கும் உத்திகள்.',
        sampleStrength: 'உணர்வு நிலைகளை அடையாளம் கண்டு அமைதிப்படுத்தும் நடவடிக்கைகளை அறிகிறார்.',
        samplePractice: 'உணர்வு அட்டைகள் அல்லது கதை பாத்திரங்களை உணர்வுகளைப் பற்றி பேச பயன்படுத்தவும்.'
      },
      {
        id: 'soc_6',
        domain: 'Social Interaction',
        title: 'சமூக அனுதாபம் மற்றும் உள்ளடக்கம்',
        text: "ஒரு வகுப்புத் தோழர் விளையாட்டு மைதானத்தில் தனியாக உட்கார்ந்திருப்பதை கண்டால், அவர்களை உள்ளடக்கமாக உணர வைக்க நீங்கள் என்ன சொல்வீர்கள் அல்லது செய்வீர்கள்?",
        criteria: 'பச்சாத்தாபம், சமூக நோக்கம் மற்றும் மற்றவரின் கண்ணோட்டத்தை புரிந்துகொள்ளுதல்.',
        sampleStrength: 'அனுதாபம், அன்பு மற்றும் நட்பான உள்ளடக்க சமூக கருத்துக்களை காட்டுகிறார்.',
        samplePractice: 'கூட்டு விளையாட்டு மற்றும் சமூக வாழ்த்து காட்சிகளை பயிற்றுவிக்கவும்.'
      },
      {
        id: 'cre_7',
        domain: 'Creativity',
        title: 'கற்பனையான விரிவாக்கம்',
        text: "நீங்கள் முழு பிரபஞ்சத்திலும் எந்த மாயாஜால விலங்கையோ கருவியையோ கண்டுபிடிக்கலாம் என்றால், அது எப்படி இருக்கும், அதற்கு என்ன சிறப்பு மாய சக்தி இருக்கும்?",
        criteria: 'கற்பனை, கதை மௌலிகம் மற்றும் படைப்பாற்றல் விரிவாக்கம்.',
        sampleStrength: 'உயிரோட்டமான விவரணை விவரங்களுடன் செழுமையான படைப்பு கற்பனை.',
        samplePractice: 'கற்பனையான கதை சொல்லுதல் மற்றும் கற்பனை உயிரினங்களை வரையவும்.'
      }
    ]
  };
export const LANGS = [["en", "EN"], ["hi", "हिन्दी"], ["ta", "தமிழ்"]];

// Tap-to-answer choices for children who answer by pointing instead of speaking (one list per question id).
export const QUICK_CHOICES = {
  en: {
    comm_1: ["I like to play", "I like to draw", "I like my family"],
    mem_2: ["I remember some", "I remember all", "I forgot"],
    att_3: ["A clock", "A book", "A shadow"],
    prob_4: ["Ask for help", "Try again", "Use another way"],
    emo_5: ["I feel happy", "I feel sad", "I feel scared"],
    soc_6: ["Say hello and play", "Share a toy", "Ask their name"],
    cre_7: ["A big colourful castle", "A fast rocket ship", "A friendly dragon"],
  },
  hi: {
    comm_1: ["मुझे खेलना पसंद है", "मुझे चित्र बनाना पसंद है", "मुझे मेरा परिवार पसंद है"],
    mem_2: ["कुछ याद है", "सब याद है", "भूल गया"],
    att_3: ["घड़ी", "किताब", "परछाई"],
    prob_4: ["मदद माँगूँगा", "फिर कोशिश करूँगा", "दूसरा तरीका"],
    emo_5: ["मैं खुश हूँ", "मैं उदास हूँ", "मुझे डर लग रहा है"],
    soc_6: ["नमस्ते कहकर खेलूँगा", "खिलौना बाँटूँगा", "नाम पूछूँगा"],
    cre_7: ["बड़ा रंगीन किला", "तेज़ रॉकेट", "दोस्त ड्रैगन"],
  },
  ta: {
    comm_1: ["எனக்கு விளையாட பிடிக்கும்", "எனக்கு வரைய பிடிக்கும்", "எனக்கு என் குடும்பம் பிடிக்கும்"],
    mem_2: ["சிலது நினைவிருக்கு", "எல்லாம் நினைவிருக்கு", "மறந்துவிட்டேன்"],
    att_3: ["கடிகாரம்", "புத்தகம்", "நிழல்"],
    prob_4: ["உதவி கேட்பேன்", "மீண்டும் முயல்வேன்", "வேறு வழி"],
    emo_5: ["நான் மகிழ்ச்சி", "நான் வருத்தம்", "எனக்கு பயம்"],
    soc_6: ["வணக்கம் சொல்லி விளையாடுவேன்", "பொம்மையை பகிர்வேன்", "பெயர் கேட்பேன்"],
    cre_7: ["பெரிய வண்ணக் கோட்டை", "வேகமான ராக்கெட்", "நட்பான டிராகன்"],
  },
};
