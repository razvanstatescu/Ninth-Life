# 13. The story, the problem statement and the narration

Written 2026-11-10 for the second cut of "Hello again". Scope: what problem the film states and in which words,
how the story is built, how the narrator writes and speaks, and two complete narrator scripts with timings.
Read with `.kiro/steering/product.md` (claims), `privacy.md`, `trademarks.md`, the first cut's storyboard
[../03-script-storyboard.md](../03-script-storyboard.md) and the sibling research in this folder:
[11](11-act2-hypermotion-wow.md) (Act 2 pictures and a bar map), [12](12-transitions.md) (transitions, "the fold")
and [14](14-narrator-voice-and-mix.md) (narrator voice, measured pace, mix).

How sources are marked:

- **Read**: I read the full text or the page itself on 2026-11-10.
- **Extract**: only a search-engine extract or summary; not read in full.
- **Repo**: a fact from this repository, with the file named.
- **Ours**: checked or decided here (for example the decoder checks in section 7).

Addresses that contain a phone maker's name are left out on purpose (hard rule for this folder; the same practice as
[../01-research.md](../01-research.md)). Those sources are named by title, publisher and date so they can be found.
No video was watched: every statement about a film comes from articles, award pages or the maker's own text.

## 0. In one screen

1. **Two problems, said plainly, with no numbers.** (a) Typing to talk takes time and effort: small keys are easy to
   miss, with one switch every letter is a wait, and the conversation moves on. (b) A language model can put words
   in your mouth. The film then shows how Ninth Life answers each: nine keys, one press per letter, the sentence,
   Speak; and a proof check so the model can only help rank. Every outside number (AAC rates, prices, people
   offline) goes in the video description or the write-up, as cited background (section 1).
2. **Recommended: Script A, "Hello again"** (section 4). Act 1 opens with a one-line pitch ("The story of a keypad
   that learned to talk") and ends on "It still has something to say." Act 2 keeps the keypad at 0:28 and
   "Hello again" at 0:36, then follows the owner's path: title, the problem (16 s), how it works ("I need water"),
   the proof, the features, and the app's last line, **"I have something to say."** About 176 narrator words.
3. **Alternative: Script B, "Dead air"** (section 5). Act 2 opens on the problem, the 26 letters fold into nine keys
   at 0:44, "Hello again" comes at 0:52, and the film ends on "It is good to be back." About 170 words. It follows
   the path literally and has the stronger musical arc; the product arrives 16 s later.
4. **One narrator, two registers** (hushed in Act 1, clear and warm in Act 2), clearly unlike the app's voice, never
   over it (14 measured the voices and the pace). A thread ties the acts: the old keypad "matched your keys", the
   model must "match your keys"; "something to say" is planted in Act 1 and spoken by the app at the end.
5. **Budget**: Act 1 about 40 to 48 words, Act 2 about 120 to 135. Plan 2.4 to 2.6 spoken words a second (the
   measured pace of the chosen voice model) with 0.4 to 0.6 s pauses, which gives a calm 2.0 to 2.2 words a second
   overall; never above 2.8 in a line.
6. **Every app line was run through the real offline decoder**: "I have something to say" ranks first; "These are my
   words" and "It is still me" do not (section 7).
7. **Risky lines and words are listed in section 6.** The three that matter most: never say or imply "faster" or
   "fewer presses" (letter mode saves no key presses in our own eval), never a first-person user (a generated voice
   posing as a user is a fake testimonial), and never "Built with Kiro" as a claim about all the work (decision D15).

## 1. The problem, in the product's allowed language

### 1.1 What the film may say, and what goes in the description

product.md allows only plain, general statements plus "free", "works offline", "runs in your browser", "every spoken
word matches the keys you pressed", and numbers from `packages/eval/RESULTS.md` with the method linked. It bans
speed claims we did not measure and research results presented as ours. So each point below has a plain film line
and, separately, cited background for the description or write-up.

| Point | Evidence | Film may say | Description or write-up only (cited, as background) |
|---|---|---|---|
| **Typing to talk takes time** | AAC "speaking rates of 3 to 20 words per minute (WPM) while non-AAC users communicate at higher rates (100-140 WPM)", citing Seale, Bisantz and Higginbotham 2020 ([Valencia et al., CHI 2023](https://discovery.ucl.ac.uk/10185220/1/3544548.3581560.pdf), Read). "Speed has been a long-acknowledged challenge in the field of AAC, but output rates ... have changed little"; one-finger, touch or eye-gaze typists "typically attain rates of 8 to 10 words per minute"; conversational speech "typically between 120 and 185 WPM" ([Waller, Griffiths and Kristensson, CACM 68(5), May 2025](https://pokristensson.com/pubs/WallerEtAlCACM2025.pdf), Read). Gaze typing "usually below 10 words per minute", speech "up to 190 WPM" ([Cai et al., Nature Communications 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652/), Read). AAC "approximately 10-16 WPM" against "140-150 WPM" ([Yusufali, Goetze and Moore, HCII 2023](https://staffwww.dcs.shef.ac.uk/people/S.Goetze/papers/2023_Yusufali_HCII_Bridging_the_Communication_Rate_Gap_Enhancing_Text_Input_for_Augmentative_and_Alternative_Communication__AAC_.pdf), Read). "AAC users produce messages at an average rate of 10 words per minute" ([AAC-RERC project R4](https://rerc2009.aac-learning-center.org/archive_aac-rerc/pages/ProjectSite/R4.htm), Read) | "Every letter is a wait." No number, and nothing later that implies Ninth Life is faster | "People who use AAC often communicate at 3 to 20 words a minute, against 100 to 140 for speech (Valencia et al. 2023)." Say that these are other researchers' figures |
| **Small keys and targets** | Touch targets "at least 18mm"; even at 18 mm a 7% error rate for people with upper-body motor impairments (Findlater et al., CHI 2017, [PDF](https://makeabilitylab.cs.washington.edu/media/publications/Findlater_ComparingTouchscreenAndMouseInputPerformanceByPeopleWithAndWithoutUpperBodyMotorImpairments_CHI2017.pdf); Repo: `docs/research/mobile-aac-evidence.md` E12, read by the team). Disabled users "need to consciously think about how to target and make selections, resulting in a greater cognitive and physical load" (CACM 2025, Read) | "Small keys are easy to miss" or "on small keys". In the solution: "Nine keys ... only bigger" | The 18 mm figure, cited. The app's keys are 72 to 128 px (a product setting, `content.md` section 5), not an eval result |
| **Effort and fatigue** | Participants valued less "typing effort and fatigue"; P6: "sometimes I just don't initiate conversations because I don't have the energy to type a lot and I can't answer quickly enough" (Valencia 2023, Read). "A major bottleneck to faster gaze typing ... is the eye fatigue" (Cai 2024, Read) | Implied by "every letter is a wait"; optionally "Every letter costs effort." | P6's quote, cited |
| **One switch, a whole keyboard to scan** | A 2018 systematic review found "a mean text entry rate of 1.27 words per minute (wpm) for scanning systems containing only character options" and 2.49 with word prediction; with scan steps over 1.5 s "as low as 0.3-0.5 wpm"; in row-column scanning "users still experience substantially increasing dead-time as more options are added" ([Bonaker, Nel, Vertanen and Broderick, ASSETS 2023](https://par.nsf.gov/servlets/purl/10521368), citing Koester and Arthanat 2018 and Koester and Simpson 2014; Read). Switch scanning "around 1.7 words per minute" (CACM 2025, Read) | "With one switch, every letter is a wait." In the solution only structure: "Touch, keyboard or one switch." Never "fewer steps" or "faster": no test of ours compares layouts (RESULTS.md gives 3.57 scan steps per character for Ninth Life alone) | The rates, cited; the design reason in the write-up: "scanning time grows with the number of options, one reason the keypad has 12 keys" |
| **The conversation moves on** | Augmented communicators "have reported feeling pressure to respond in time and having others not wait long for their answers" (Valencia 2023, citing Valencia et al., CHI 2020, "Conversational Agency in AAC", Read). "Long 'gaps' between conversational turns ... are all known to affect the enjoyment of conversation for both sides" (CACM 2025, Read). Conversations "move very quickly over a range of topics"; partners should "pause, wait and allow time" and "Stop predicting what the other person is likely saying" ([AssistiveWare](https://assistiveware.com/learn-aac/7-ways-to-include-aac-users-in-conversation), Read). Higginbotham and Wilkins 1999, "Slipping through the timestream" ([chapter listing](https://www.oreilly.com/library/view/constructing-incompetence/9780805825909/xhtml/10_Chapter3.xhtml), Extract) | "The conversation moves on." Plus the other person's text bubbles | Cited background |
| **A language model can put words in your mouth** | 12 adults who use AAC tested live model suggestions: phrases should "reflect their own communication style"; the model "often guessed and made up information" (a 100-pound dog became "a cute little dog"); "AI suggestions could undermine autonomy" ("someone said 'oh, the device did that for you'"); concerns "about the potential loss of control" (Valencia 2023, Read). "We highlight risks related to authorship and authenticity of the message produced by LLM-enabled VOCAs" and "We counsel against the uncritical inclusion of LLMs" ([Griffiths, Broomfield, Hrastelj, Judge and Toogood, J. Enabling Technologies 19(2), 2025](https://discovery.dundee.ac.uk/en/publications/ai-communication-aids-and-the-challenge-of-authentic-authorship-w/), abstract Read). Faced with uncertainty "many users will simply abandon prediction" (CACM 2025, Read). 6 of 12 adults said automatic personalization was never a good feature ([Martin and Nagalakshmi, arXiv 2404.17730v3](https://arxiv.org/html/2404.17730v3), Read in part) | "And a language model can put words in your mouth." Then: "A model can help rank, if you turn it on. But every word must match your keys. So it can't put words in your mouth." (product.md's own claim) | External citations. Our own model runs (section 1.2) only in the write-up, with full context |
| **Privacy** | Participants worried about "other people using their data without their consent, identity theft and data breaches ... and on-cloud data processing"; without privacy or "clear transparency ... they would absolutely not use it" (Valencia 2023, Read). 11 of 12 were concerned about outsiders collecting their data; 9 were unsure of their app's data policy (Martin and Nagalakshmi, Read in part) | Only exact phrases: "No account." "...if you turn it on" (model ranking). Not "private", "secure", "nothing leaves your device", "nothing is kept" | The provider copy from `lib/rankingProvider.ts`, the voices note and the Listen note (product.md, honest limits) |
| **Offline** | "2.2 billion people remain offline"; "85 per cent in urban areas are online versus 58 per cent in rural areas" ([ITU Facts and Figures 2025, 17 Nov 2025](https://www.itu.int/en/mediacentre/Pages/PR-2025-11-17-Facts-and-Figures.aspx), Read). Reliability raised by 6 of 12; "always have and always will carry pen and paper just because it's the most reliable" (Martin and Nagalakshmi) | "No signal? It still works. We call it ghost mode." | ITU as context only. The description says "after one visit" |
| **Cost** | Tablet-based speech-generating device $500 to $800, including "$150-$300+ for a robust AAC app"; dedicated devices $1,800 to $8,000; eye-gaze devices $16,000 or more (["Finding & Funding AAC", slides by speech-language pathologists, Pennsylvania DHS Tech Accelerator, undated](https://www.pa.gov/content/dam/copapwp-pagov/en/dhs/documents/pa-tech-accelerator-assistive-technology/06-finding-and-funding-aac-tech-accel.pdf), Read). 10 of 12 said affordability mattered; 4 gravitate toward free apps (Martin and Nagalakshmi) | "Free." Never a named product or price comparison | The ranges, cited, without product names |
| **Where 9-key predictive text came from** | [../01-research.md](../01-research.md), section 5 | No (decision D4 is open) | Only if D4 says yes |

The populations in some of these studies are described by condition. That is fine as cited background in the
write-up (product.md allows it); none of it goes into the film or into lines that say who Ninth Life is for.

### 1.2 Our own numbers

| Fact (Repo: `packages/eval/RESULTS.md`, method `docs/architecture/data-and-eval.md` section 4) | Where it may go |
|---|---|
| 866 test sentences, simulated typist, offline dictionary: intended sentence first 85.6%, in the top 5 97.3%, word accuracy 96.8% | Description, with the method link and "a simulated typist, not people" (the website's wording). Never in the narration: a spoken number cannot carry its method |
| KSR -0.0%: "letter mode saves no key presses" | Nowhere as a boast, but it binds the script: never imply fewer presses |
| Model runs, 200-item samples, 2026-11-09: when a model got only the digits (B2), 96.3% and 8.9% of its sentences (two models, one provider) failed the key check before the validator; with the word lattice (B4), 0.5% and 0.0%; the validator drops all of them | The write-up only, with sample size, both configs and the method link. The website keeps model-run numbers off the page (D14, `.agents/tasks/marketing-landing/decisions.md`); follow its reasoning. It is the strongest evidence we have that the proof check matters |

### 1.3 Words the film must not use

- "Faster", "quicker", "saves keystrokes", "fewer presses", "in seconds", or any number.
- "AI understands you", "reads your mind", "knows what you mean", "gives you a voice", "your voice back",
  "restores", "therapy", "for people with ..." (any condition), and "nonverbal" or "nonspeaking" as labels
  (`design/system/README.md`, voice and content).
- "Private", "secure", "encrypted", "nothing is kept", "100%".
- "Built with Kiro" as a claim about all the work (the website replaced the phrase, D15). Say "Made for Kiroween 2026".
- A first-person user ("I type to talk because ..."): a generated voice posing as a user is a fabricated
  testimonial, and the website bans testimonials (`content.md`, Never on the page). "We" is only the makers.
- Phone makers, phone models and the words listed in `trademarks.md`.

## 2. Story structure

### 2.1 Stating a problem in 10 to 15 seconds, then turning

| Principle | Source |
|---|---|
| Open with who and the frustration, concretely: "In the opening 15-20 seconds, start with Setup + Need: introduce who you're building for and the frustration they face"; "Keep it concrete - one or two moments that viewers will instantly recognize"; "Show the frustration without your app" | [RevenueCat, "How to win Shipaton, part 4"](https://www.revenuecat.com/blog/engineering/how-to-win-shipaton-part-4-pitching-your-app), Read |
| Pitch early: "Start with your pitch and a quick overview of your project before diving in"; say what the app does and how it meets the challenge "within the first few seconds"; tie everything "back to the problem and who it helps"; do not "speed up the audio to fit the time limit" | [Devpost, "6 tips for making a winning hackathon demo video"](https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video), Read |
| Two sentences can hold the problem and the turn. A fax project's headline: "Your parents can't use the internet. Their fax machine can." Old technology as the answer to a present need, the same move as ours | [faxi.jp/en](https://faxi.jp/en/), Read |
| Not a feature list: "avoid the common pitfall of reducing your pitch to a feature list"; narrate "what the user is achieving, not just what the interface looks like" | RevenueCat, Read |
| Beats joined by "but" or "therefore", never "and then": "but" or "therefore" "gives you causation between each beat, and that's a story" | Trey Parker and Matt Stone's NYU talk, via [No Film School](https://nofilmschool.com/2015/04/tony-zhou-storytelling-video-essay-f-fake-therefore-but-and-then), Read |
| A story spine: once upon a time, every day, one day, because of that, until finally | Emma Coats's storytelling rules, rule 4 ([Laughing Squid](https://laughingsquid.com/22-rules-of-storytelling/)), Extract |

What this means here: one sentence for who, two for the cost (time, the conversation), one for trust; one picture
per sentence; and a question from the other person ("What do you need?") that the solution answers later in the
person's own words ("I need water"). The turn is causal: "So ..." or the fold of 12, never "And now ...".

### 2.2 How the film is judged

The live rules page answered 403 again on 2026-11-10, so the 2026 wording comes from the repository's extracts
([../01-research.md](../01-research.md) section 1; `docs/research/assumptions-register.md` R-02, read by the team on
2026-11-06). Read it by hand before picture lock.

| Criterion (2026, 20% each) | What the judges ask (extract) | Where the narrated film answers |
|---|---|---|
| Potential Impact | A real problem for a real audience | The problem section: who, the cost, trust |
| Technological Implementation | How well Kiro is used | Mostly the repository and write-up; in the film the Kiro chapter and the proof check ("every word must match your keys") |
| Design | "a complete, coherent product experience" | Real captures of the app on a phone |
| Innovation/Idea | How new the idea is | The old keypad's honesty (only words that match) applied to a language model |
| Presentation | "Does the video clearly demonstrate the project working end-to-end?" "Does the pitch communicate what problem is solved, who it's for, and why it matters?" "Is the presentation creative and memorable?" | Typing, the sentence, Speak, the voice; the problem lines; the two voices and the callbacks |

Best Demo goes to the top Presentation score among the top 10%. Stage one is a pass or fail on theme fit and Kiro use.
For comparison, the 2025 edition judged "Potential Value: How useful, accessible, and impactful is your solution?",
"Implementation" and "Quality and Design", with the same Resurrection text: "Bring your favorite dead technology back
to life. Reimagine obsolete tech with today's innovations or solving tomorrow's problems."
([kiro.dev, "This is Kiroween"](https://kiro.dev/blog/kiroween-2025/), Read).

### 2.3 Films that did this well

| Film | What it does | What we take, and what we must not copy | Source |
|---|---|---|---|
| "Loretta", a 2020 Super Bowl ad for a voice assistant, 90 s | An old man's voice asks the assistant to help him remember his late wife; slow typing in a search box; inspired by a real employee's grandfather, whose voice the team kept as the voice-over. The creative director: "At its core, it's a demo with heart"; "a demonstration ... told in a human way" | A human-sounding narrator next to the product's own voice; small, concrete details; the product shown working. Not copied: a real person's voice and story. We have no user, so our narrator is a storyteller, not a user | [The Ad Leaf, 12 Feb 2020](https://www.theadleaf.com/?p=6923), Read; MSU Today, 10 Feb 2020, "MSU alumnus brings millions to tears with ... 'Loretta' ad" (address left out), Read |
| "Parisian Love", a 2010 Super Bowl ad, 52 s | A love story told only through typed search queries, from studying abroad to assembling a crib | The typed text can be the plot. Ours already is: `hello`, "Hello again", "I need water", "I have something to say" | CNN Money, 8 Feb 2010, Super Bowl ad report (address left out), Extract |
| "We All Win", a 2019 Super Bowl spot for an adaptive game controller, 60 s | Young gamers narrate their own experience. Grand Prix, Brand Experience and Activation, Cannes Lions 2019 | Lived experience is the strongest narrator. We have none yet (no user testing), so we must not imitate it | [Cannes Lions campaign page](https://www.lovethework.com/work-awards/campaigns/we-all-win-585401), Read (title only); World Federation of Advertisers case note, 21 Apr 2020 (address left out), Read, for the award; that the children narrate their own stories comes from a university disability centre's press release (address left out), Extract |
| "The Greatest", a 2022 accessibility film | No narrator: people using accessibility features, cut to music. Emmy, Outstanding Commercial (2023); One Show Best of Show. An audio-described version is reported | The first cut's no-narrator approach has precedent; a narrated or described version serves viewers who cannot see the screen | Television Academy award page (address left out), Read; [The One Show](https://www.oneclub.org/awards/theoneshow/-award/49499/), Extract; audio description, Extract |
| A personal computer's introduction, January 1984 | The machine speaks for itself on stage ("Hello, I am ...") "in strange but somehow endearing tones", then hands over to its maker's founder | The product's own voice as the climax, given silence: our "Hello again" | [Andy Hertzfeld, folklore.org](https://www.folklore.org/Intro_Demo.html), Read |
| Winners of a 2024 developer competition run by a language-model provider | Most Impactful: a step-by-step guide for everyday tasks; a platform prize: eye tracking that generates "full sentences from single words"; Best Web: automatic audio description | Accessibility entries win on a concrete need. The field is moving toward models that expand a few inputs into whole sentences, which makes "every word must match your keys" a clear stance. Write-up only, and never disparaging | The organiser's developer blog, 21 Nov 2024, "Announcing the winners of the ... API Developer Competition" (address left out), Read |

Not found: a documented breakdown of a Best Demo video, or of the 2025 Resurrection winner's video (the gallery
answered 403). The fax project's page says "Winner · AWS Global Hackathon"; that it won Resurrection in 2025 is a
search extract in 01-research and is not verified.

### 2.4 The spine of this film

The chain, with "but" and "therefore" where they belong:

1. Once, nine keys were enough to write. One press per letter, and the phone worked out the word: every word it
   offered matched your keys.
2. **But** glass replaced the keys, and the keypad went quiet.
3. **But** old is not the same as bad. It still has something to say.
4. **Therefore** it comes back, and this time it speaks: "Hello again."
5. Why it matters: some people type to talk. Every letter is a wait, the conversation moves on, **and** a language
   model can put words in your mouth.
6. **Therefore** Ninth Life keeps what the old keypad got right: nine keys, one press per letter, only bigger. It
   finds the sentence; you press Speak: "I need water."
7. **But** what about the model? It can only help rank: every word must match your keys, **so** it cannot put words
   in your mouth.
8. **And** it works the way the old keypad did and the way you type: no signal needed, free, touch, keyboard or one
   switch, or shown in big type.
9. **Until finally**: "Old is not the same as bad." And the keypad, which still had something to say, says it: "I have
   something to say."

## 3. Narration craft

### 3.1 How fast a calm narrator speaks

| Source | What it says | Mark |
|---|---|---|
| National Center for Voice and Speech, via [Lumen Learning](https://courses.lumenlearning.com/wm-publicspeaking/chapter/articulation-pitch-and-rate/) | Average US English speaking rate "around 150 words per minute"; in public speaking "around 125-150 words per minute" | Read (the NCVS original not seen) |
| Broadcast journalism textbook, chapter "Newsreading mechanics" ([O'Reilly listing](https://www.oreilly.com/library/view/broadcast-journalism-6th/9780240810249/xhtml/ch17.xhtml)) | Three words a second (about 180 a minute) for radio news; television "a little slower" | Extract |
| Waller, Griffiths and Kristensson, CACM 2025 | Conversational speech 120 to 185 words a minute | Read |
| Narration guides ([Bread n Beyond](https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/), cited by 11) | About 150 words a minute as the explainer convention | Extract |
| [14](14-narrator-voice-and-mix.md), measured | On the chosen model (`eleven_v4`) every tested narrator spoke 2.4 to 2.7 words a second with 0.4 to 0.6 s pauses at full stops; v4 has no speed control | Ours (another agent's measurement) |

**Range for this film.** Act 1, hushed: 2.0 to 2.2 words a second overall (120 to 130 a minute). Act 2, clear and
warm: 2.3 to 2.6 (140 to 155 a minute). No line above 2.8. Because v4 speaks at 2.4 to 2.7 whatever the settings,
the calm comes from the edit: short phrases rendered as separate files and placed apart, with 0.4 to 0.6 s between
sentences and 0.8 to 1.2 s at a scene change (14 recommends the same). If a take runs long, cut words; never speed
up (Devpost's tip 5).

### 3.2 How many words fit

**Act 1 (28 s).** Silences are fixed by the picture: the five "hello" presses (0:06.5 to 0:09.0), the four "good"
presses (0:11.0 to 0:12.4), the set switching off (about 0:19.9 to 0:21.4) and the last 0.3 s before Act 2's downbeat.

| Window | Time | Length | Fits at 2.4 words/s, with a breath | Used (A / B) |
|---|---|---|---|---|
| Opening, static | 0:00.4 to 0:04.2 | 3.8 s | 8 to 9 | 9 / 5 |
| The whole phone | 0:04.5 to 0:06.3 | 1.8 s | 3 to 4 | 3 / 4 |
| After `hello` | 0:09.1 to 0:10.9 | 1.8 s | 4 | 4 / 4 |
| `good`, `home`, `gone` | 0:12.6 to 0:15.7 | 3.1 s | 7 | 7 / 7 |
| The keys go dark | 0:16.0 to 0:18.1 | 2.1 s | 5 | 5 / 5 |
| The dusty phone | 0:18.2 to 0:19.8 | 1.6 s | 4 | 4 / 5 |
| Black, the dot | 0:21.6 to 0:24.9 | 3.3 s | 8 | 8 / 8 |
| The dot warms | 0:25.2 to 0:27.7 | 2.5 s | 6 | 6 / 6 |
| **Total** | | **about 20 s** | **about 45** | **46 / 44** |

This assumes three small picture changes (section 8): shot 3b (the worn key) is cut, so the keys go dark at 0:16.0
and the set switches off at about 0:19.9, and scene 5 shows only the two lines the narrator says.

**Act 2 (86 s).** Take out the app's three lines with their silences (about 7 s), the key melody of "hello again"
and the rebirth (about 8 s), the title drop (1 s), the fold (1 beat), the Kiro lift (4 s) and the end card's reading
time (at least 6 s): about 55 s of room, so 120 to 135 words at 2.4 to 2.5 a second. 11 reaches the same ceiling
(about 135, plan 110 to 130). Both scripts below sit at 126 to 130.

### 3.3 Writing for the ear

1. **One idea per sentence, 3 to 12 words, subject first.** Listeners cannot go back to an earlier clause (NPR
   Training, "[Would you say it that way?](https://www.npr.org/sections/npr-training/2025/05/31/g-s1-66074/would-you-say-it-that-way-tips-on-writing-for-your-voice)",
   Extract; its print-to-radio guide calls dependent clauses "toxic" to radio writing,
   [NPR Training](https://www.npr.org/sections/npr-training/2025/05/30/g-s1-65814/the-journey-from-print-to-radio-storytelling-a-guide-for-navigating-a-new-landscape),
   Extract).
2. **Concrete nouns.** Keys, letter, switch, light, sentence, water, signal. Never platform, solution, leverage,
   AI-powered.
3. **Rhythm.** Short, short, long. Lists of three ("Touch, keyboard or one switch"). End the sentence on the word that
   matters ("...in your mouth", "...ghost mode").
4. **Numbers as words, and few of them.** "Nine keys", never "2 to 9" spoken; no statistics.
5. **Disambiguate for the ear.** "You press Speak" (the button), not "it speaks when you speak". "For an afternoon
   or for good" can be misheard as "for a good cause": keep its on-screen line.
6. **Say why, show how.** The picture shows the digits and the struck "wafer"; the narrator says the rule.
7. **Persons.** "You" for the viewer, "some people" for who it is for, "we" only for the makers, never "I" for a user.
8. **Read aloud, then generate, then measure** (14's `measure.py`), and fix the words, not the speed.

### 3.4 Lines that bridge scenes

- **Causal words at the seams**: "But", "So", "And" (2.1).
- **Callbacks** (plant, then pay off):

| Thread | Planted | Paid off |
|---|---|---|
| `hello` | Act 1, typed on the old phone | The app: "Hello again." |
| Matching keys | "Every word it offered matched your keys." (Act 1) | "But every word must match your keys." (proof) |
| Words in your mouth | "And a language model can put words in your mouth." (problem) | "So it can't put words in your mouth." (proof) |
| Something to say | "It still has something to say." (end of Act 1) | The app: "I have something to say." (Script A) |
| Old is not the same as bad | Act 1, black screen | Said again over then and now (Script A) |
| No signal | The set's `no signal`; "Dead air." (Script B) | "No signal? It still works." |
| Nine keys, one press | "Remember? Nine keys." / "One press, one letter." | "Nine keys, one press per letter, like the old keypad. Only bigger." |
| The question | The other person's bubble: "What do you need?" (problem) | The app's They said line shows it again; the answer: "I need water." |
| Talk | "...back as a way to talk." (title) | "Some people type to talk." (next line) |

- **Split edits.** Bring a line in one eighth (15 frames) before the picture it motivates (J-cut) or let a closing
  line run one beat into the next picture (L-cut); 12 sets these rules
  ([J cut](https://en.wikipedia.org/wiki/J_cut), Read).
- **Questions across a cut**: "No signal? It still works."
- **Silence as a joint**: the narrator stops one beat before 12's fold and before each app line, so the picture or
  the app's voice turns the page.
- **One voice, two registers**: the same narrator across both acts holds it together as one story; the change from
  hushed to clear marks the act change.

### 3.5 Narration and on-screen text

| Rule | Why |
|---|---|
| Act 1: the pixel caption is the narrator's line, word for word (6 words or fewer), on screen from the first spoken word until at least 0.5 s after the last. Nothing else on screen while he speaks | Short text that repeats the narration is the exception in the redundancy principle; the old type works as open captions in the old style |
| Act 2: key words only, an exact excerpt of the spoken line, 1 to 5 words (11 caps it at 4), appearing 0 to 4 frames before the word is spoken, next to the UI they name | Redundancy: people learn better from "a combination of spoken words and graphics" and designers "should avoid presenting the same information in multiple formats simultaneously"; signalling: "cues ... to draw attention to vital information"; temporal contiguity ([Digital Learning Institute, Mayer's principles](https://www.digitallearninginstitute.com/blog/mayers-principles-multimedia-learning), Read). The exception for short highlighted text ([NUS summary of Mayer 2008](https://medicine.nus.edu.sg/medixperience/scholarly-article/mayers-12-principles-of-multimedia-instruction/), Extract) |
| Never a different sentence on screen while the narrator speaks; never text over moving UI | Split attention; 06, section 4 |
| The app's own words (status pill, the proof sentence) stay small; the narrator does not read them | They are the picture, and true to the app |
| When the app speaks, its sentence is the only text, big, its words lighting as spoken; no narration within 0.5 s either side | 11 section 5.4 and 14 section 4.4 |
| Reading speed at most 20 characters a second | Netflix, adult titles: "Up to 20 characters per second" ([Timed Text Style Guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide), Read) |
| The intended-purpose sentence is never narrated and gets at least 6 s of quiet | product.md; reading time |

### 3.6 Two voices

- **One narrator for both acts**, a different person from the app's voice. 14 chose a low male British voice, 9 to
  11 semitones under the app's female voice, and measured both. Act 1 uses its quiet tag; Act 2 is untagged.
- **The app's voice is the hero**: the loudest, alone, its words lit. The narrator never quotes the app's lines and
  never talks over them.
- **Captions name the speaker** ("Narrator:" and "App voice:"), as WCAG 1.2.2 asks: captions "identify who is
  speaking and include non-speech information" ([Understanding 1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html), Read).
- **People learn better from a human-sounding voice** ("voice principle", Digital Learning Institute, Read): pick a
  natural narrator; the app's voice may stay plain, like a good device voice (04-asset-plan, section 4.4).
- **Disclosure**: the description says the narrator, the app's voice and the music are generated (decisions D2 and
  D8). That lets the end card drop its credit line. YouTube's disclosure page lists generated music "that's the main
  focus of the video" and making "a real person appear to say or do something" as needing disclosure, and does not
  mention a generated narrator (YouTube Help, "Disclosing use of altered or synthetic content", address left out,
  Read).

### 3.7 ElevenLabs, as far as writing is concerned

From the [best-practices page](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices) (Read)
and 14:

- "Eleven v4 and Eleven v3 do not support SSML break tags": render each line, or each half of a long line, as its own
  file and place it on the timeline. That also makes J-cuts and L-cuts exact.
- "Ellipses (...) add pauses and weight"; "Capitalization increases emphasis". Use neither as a habit; one ellipsis is
  allowed where Act 1 needs a held breath ("Dead air ...").
- Stage directions written in prose are read aloud ("the model will still speak out the emotional delivery guides");
  use only the audio tag in brackets that 14 tested.
- No numbers in the narration, so no normalisation issues.
- Ask for timestamps for the caption file, as the app's voice already does.

### 3.8 Accessibility of the film itself

WCAG 1.2.3 and 1.2.5: no extra audio description is needed "if all of the important information in the video track
is already conveyed in the audio track" ([Understanding 1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html), Read).
With a narrator most of the story is now in the audio. Still visual only: the other person's bubbles, the struck
"wafer" and the end card. Put the intended-purpose sentence and the address in the description so a listener gets
them too.

## 4. Script A, "Hello again" (recommended)

Hook first. Bars and times use the film's grid: Act 2 bar *n* starts at 0:28 + 2 x (*n* - 1) s. N = narrator.
"Key words" are the only text the narrator gets on screen. Word counts are narrator words.

### Act 1, hushed (0:00 to 0:28)

| # | Time | Speaker | Line | Words | Key words (pixel type) | Picture and sound |
|---|---|---|---|---|---|---|
| 1 | 0:00.4 to 0:04.2 | N | The story of a keypad that learned to talk. | 9 | (the set's own `ch 09`, `no signal`) | Black, the tube switches on, static. The hiss dips under the voice |
| 2 | 0:04.5 to 0:06.3 | N | Remember? Nine keys. | 3 | nine keys. | The whole phone |
| | 0:06.5 to 0:09.0 | | (silence) | | | Keys 4 3 5 5 6, five beeps, `hello` |
| 3 | 0:09.1 to 0:10.8 | N | One press, one letter. | 4 | one press, one letter. | `hello` holds |
| | 0:11.0 to 0:12.4 | | (silence) | | | Keys 4 6 6 3, `good` |
| 4 | 0:12.6 to 0:15.6 | N | Every word it offered matched your keys. | 7 | every word matched your keys. | Next, Next: `good`, `home`, `gone`; `4663` stays |
| 5 | 0:16.0 to 0:18.1 | N | Then glass replaced the keys. | 5 | then glass replaced the keys. | The key lights go out row by row |
| 6 | 0:18.2 to 0:19.8 | N | The keypad went quiet. | 4 | the keypad went quiet. | The dusty phone |
| | 0:19.9 to 0:21.4 | | (silence) | | | The set switches off: a line, a dot |
| 7 | 0:21.6 to 0:24.9 | N | But old is not the same as bad. | 8 | old is not the same as bad. | Black, one pale dot |
| | 0:25.0 to 0:25.2 | | (silence) | | | The 3 by 3 wink |
| 8 | 0:25.2 to 0:27.7 | N | It still has something to say. | 6 | it still has something to say. | The dot warms to ember; the lines go at 0:27.6 |

Act 1: 46 words.

### Act 2, clear and warm (0:28 to 1:54)

| # | Bars | Time | Speaker | Line | Words | Key words | Picture |
|---|---|---|---|---|---|---|---|
| | 1 to 4 | 0:28 to 0:36 | | (no narration: the rebirth, then the key melody of `hello again`) | | the digits | The dot becomes the ninth key; the keypad assembles; 43556 0 24246 |
| 9 | 5 | 0:36.2 to 0:37.3 | **App** | **Hello again.** | (2) | **Hello again**, words lit | Music stops dead |
| 10 | 6 to 8 | 0:39.0 to 0:44.4 | N | This is Ninth Life: the old phone keypad, back as a way to talk. | 14 | Ninth Life | The drop on bar 6 beat 1, then the icon and name |
| 11 | 9 to 10 | 0:44.7 to 0:48.9 | N | Some people type to talk, for an afternoon or for good. | 11 | Type to talk. / For an afternoon, or for good. (small) | Type on night |
| 12 | 11 to 13 | 0:49.2 to 0:53.8 | N | Every letter is a wait, on small keys or with one switch. | 12 | Every letter is a wait. / One switch (label) | A grid of 26 small letter cells, our own drawing; a fingertip ring misses a cell; then the ember highlight steps one cell per beat. The other person's bubble: "What do you need?" |
| 13 | 14 | 0:54.1 to 0:55.6 | N | The conversation moves on. | 4 | | Their next bubbles: "Tea?", then "Never mind." |
| 14 | 15 to 16 | 0:55.8 to 0:59.6 | N | And a language model can put words in your mouth. | 10 | Words in your mouth. | A plain grey "suggested" chip, like no real app, writes "I need tea": words nobody typed. Narrator silent from 0:59.6 for 12's fold, which lands on bar 17 |
| 15 | 17 to 19 | 1:00.4 to 1:05.0 | N | Nine keys, one press per letter, like the old keypad. Only bigger. | 12 | One press per letter. | The app; its They said line shows "What do you need?"; keys 4, Space, 6333, Space, 92837 |
| 16 | 19 to 21 | 1:05.4 to 1:08.2 | N | It finds the sentence. You press Speak. | 7 | It finds the sentence. | "I need water", "I need waves", "I need yates"; Speak takes the ember |
| 17 | 22 | 1:10.1 to 1:11.2 | **App** | **I need water.** | (3) | **I need water**, words lit | Music down 12 dB; then the pull-back to the real app on a phone |
| 18 | 23 to 24 | 1:12.3 to 1:16.2 | N | A model can help rank, if you turn it on. | 10 | Model ranking (opt-in) (the app's label) | The model's card offers "wafer" |
| 19 | 25 | 1:16.5 to 1:19.2 | N | But every word must match your keys. | 7 | Every word must match. | 9 2 3 3 7 under 9 2 8 3 7; the third digit differs; "wafer" struck |
| 20 | 26 to 27 | 1:19.5 to 1:22.5 | N | So it can't put words in your mouth. | 8 | | "water" keeps its check |
| 21 | 28 to 29 | 1:23.0 to 1:26.9 | N | No signal? It still works. We call it ghost mode. | 10 | Works offline. / Ghost mode | A capture with the network off: the app's pill "Offline. Using your dictionary." |
| 22 | 30 to 31 | 1:27.2 to 1:30.4 | N | Free. No account. Touch, keyboard or one switch. | 8 | Free. / No account. / Touch. Keyboard. One switch. | The ember block behind "Free."; phone captures of the three ways (no tablet) |
| 23 | 32 | 1:30.6 to 1:32.2 | N | Or show it, big. | 4 | Or show it. | Show mode, then Flip |
| | 33 to 34 | 1:32 to 1:36 | | (no narration: the music lifts) | | Made for Kiroween 2026 / Specs. Steering. Hooks. | Real Kiro captures, one row of `docs/KIRO_LOG.md` behind each |
| 24 | 35 to 36 | 1:36.3 to 1:39.1 | N | Old is not the same as bad. | 7 | then / now | The Act 1 inset beside the card; the inset switches off; the card holds `4 4283 766384464 86 729` |
| 25 | 37 | 1:40.2 to 1:41.8 | **App** | **I have something to say.** | (5) | **I have something to say**, words lit | Music stops dead |
| | 38 | 1:42 to 1:44 | | (silence, then the five-note motif) | | | |
| 26 | 39 to 40 | 1:44.6 to 1:47.0 | N | Ninth Life. Free, in your browser. | 6 | | End card: icon and name, the address, the intended-purpose sentence |
| | 40 to 43 | 1:47 to 1:54 | | (quiet) | | | The sentence readable for at least 6 s |

Act 2: 130 words. Script A: **176 narrator words** and the app's three lines.

**Options.** A bridge at bar 2 ("Some things are worth bringing back.", 6 words) if the owner wants the narrator to
carry across the act change; 11 and the default above leave bars 1 to 5 to the keypad, so the app's "Hello again"
answers the narrator's "It still has something to say." A Kiro line, only if every word is in the Kiro log: "Its rules
live in Kiro: specs, steering, hooks." (8 words). "Back to that question." (4 words) before line 15 helps sighted
viewers but means nothing to a listener; leave it out unless the narrator also says the question.

**If the lead keeps 11's shorter bar map** (the problem in bars 8 to 10, 6 s): say "Some people type to talk. Every
letter is a wait, and the conversation moves on." (15 words) and move trust into the proof: "A language model could
put words in your mouth. Here, it only helps rank, if you turn it on. Every word must match your keys." (26 words,
bars 18 to 22). The app's lines then stay at bars 5, 16 and 37.

## 5. Script B, "Dead air" (alternative)

Problem first: Act 2 opens on the problem, the ember dot becomes the scan highlight, and 12's fold turns the 26 letters
into the keypad. Atmosphere opens Act 1; the pitch arrives with the problem. It ends on the resurrection line.

### Act 1, hushed (0:00 to 0:28)

| # | Time | Speaker | Line | Words | Key words (pixel type) |
|---|---|---|---|---|---|
| 1 | 0:01.3 to 0:02.3 | N | Dead air ... | 2 | (`no signal`) |
| 2 | 0:03.0 to 0:04.2 | N | Then, a signal. | 3 | (the picture locks) |
| 3 | 0:04.5 to 0:06.3 | N | Nine keys. One thumb. | 4 | nine keys. one thumb. |
| | 0:06.5 to 0:09.0 | | (silence: `hello`) | | |
| 4 | 0:09.1 to 0:10.8 | N | One press per letter. | 4 | one press per letter. |
| | 0:11.0 to 0:12.4 | | (silence: `good`) | | |
| 5 | 0:12.6 to 0:15.6 | N | Every word it offered matched your keys. | 7 | every word matched your keys. |
| 6 | 0:16.0 to 0:18.1 | N | Then glass replaced the keys. | 5 | then glass replaced the keys. |
| 7 | 0:18.2 to 0:19.9 | N | And the keypad went quiet. | 5 | the keypad went quiet. |
| 8 | 0:21.6 to 0:24.9 | N | But old is not the same as bad. | 8 | old is not the same as bad. |
| 9 | 0:25.2 to 0:27.7 | N | It still has something to say. | 6 | it still has something to say. |

Act 1: 44 words. Pictures and silences as in Script A.

### Act 2, clear and warm (0:28 to 1:54)

| # | Bars | Time | Speaker | Line | Words | Key words | Picture |
|---|---|---|---|---|---|---|---|
| 10 | 1 to 2 | 0:28.3 to 0:32.5 | N | Some people type to talk, for an afternoon or for good. | 11 | Type to talk. / For an afternoon, or for good. (small) | The ember dot falls into a crowded grid of small letter cells |
| 11 | 3 to 5 | 0:32.9 to 0:37.5 | N | Every letter is a wait, on small keys or with one switch. | 12 | Every letter is a wait. / One switch | The dot becomes the scan highlight, one cell per beat; a ring misses a cell; bubble "What do you need?" |
| 12 | 5 to 6 | 0:37.9 to 0:39.4 | N | The conversation moves on. | 4 | | "Tea?", then "Never mind." |
| 13 | 6 to 8 | 0:39.8 to 0:43.6 | N | And a language model can put words in your mouth. | 10 | Words in your mouth. | The grey "suggested" chip: "I need tea". Silent from 0:43.6 |
| 14 | 9 to 10 | 0:44.6 to 0:47.6 | N | So we brought back the old phone keypad. | 8 | | The fold lands on bar 9: the cells fly into nine keys, the highlighted cell carries the ember into the ninth |
| | 11 to 12 | 0:48 to 0:52 | | (key melody: `hello again`) | | the digits | |
| 15 | 13 | 0:52.2 to 0:53.3 | **App** | **Hello again.** | (2) | **Hello again** | Music stops dead |
| 16 | 14 to 15 | 0:54.5 to 0:56.1 | N | This is Ninth Life. | 4 | Ninth Life | The drop |
| 17 | 16 to 18 | 0:58.4 to 1:03.0 | N | Nine keys, one press per letter, like the old keypad. Only bigger. | 12 | One press per letter. | They said: "What do you need?"; 4, Space, 6333, Space, 92837 |
| 18 | 18 to 20 | 1:03.6 to 1:06.4 | N | It finds the sentence. You press Speak. | 7 | It finds the sentence. | The three sentences; Speak takes the ember |
| 19 | 21 | 1:08.1 to 1:09.2 | **App** | **I need water.** | (3) | **I need water** | Music down; the pull-back to the real app |
| 20 to 22 | 22 to 26 | 1:10.3 to 1:20.5 | N | A model can help rank, if you turn it on. / But every word must match your keys. / So it can't put words in your mouth. | 25 | as in A | The proof, as in A |
| 23 to 25 | 27 to 31 | 1:21.0 to 1:30.2 | N | No signal? It still works. We call it ghost mode. / Free. No account. Touch, keyboard or one switch. / Or show it, big. | 22 | as in A | as in A |
| | 32 to 33 | 1:30 to 1:34 | | (no narration) | | Made for Kiroween 2026 | Kiro captures |
| 26 | 34 | 1:34.4 to 1:36.4 | N | Same keys. Its ninth life. | 5 | Same keys. / Ninth life. | Then and now; the inset switches off |
| 27 | 37 | 1:40.2 to 1:41.9 | **App** | **It is good to be back.** | (6) | **It is good to be back** | Music stops dead |
| 28 | 39 to 40 | 1:44.6 to 1:47.0 | N | Ninth Life. Free, in your browser. | 6 | | End card |

Act 2: 126 words. Script B: **170 narrator words**.

### A or B?

| | A, "Hello again" | B, "Dead air" |
|---|---|---|
| First product picture, first app voice | 0:28, 0:36 | 0:44, 0:52 |
| Problem stated | 0:44 to 1:00, after a 16 s hook | 0:28 to 0:44, straight after Act 1 |
| Owner's path (problem, how, features) | From the title on | Literally, from the first bar of Act 2 |
| Pitch in the first seconds | Yes, line 1 | No: atmosphere first |
| Music | Today's arc kept (build, stop, drop), then thinned for the problem | Tension, fold, build, stop, drop: a stronger arc, but the track must be rearranged |
| Change to the first cut | Small: scenes 6 to 8 stay | Larger: scenes 6 and 7 move after a new problem scene |
| Ending | Agency: "I have something to say" | Resurrection: "It is good to be back" |

A is recommended because the hackathon asks to see the project working and Devpost asks for the pitch first; B is the
better film if the owner reads "the problem first" literally and accepts the product 16 s later. The endings can be
swapped between the scripts.

## 6. Claim check and risky lines

Every narrator line was checked against product.md (allowed and banned claims, who it is for), `privacy.md`,
`trademarks.md` and the website's "Never on the page" list. Lines not listed are plain and allowed.

| Line or element | Risk | Why, and what to do |
|---|---|---|
| "Every letter is a wait ..." followed by "Nine keys ... Only bigger." | Medium | Together they can be heard as "Ninth Life is faster". Keep the solution structural; never add "faster", "quicker" or "fewer presses" (KSR is about 0 in RESULTS.md) |
| "And a language model can put words in your mouth." | Low | A general statement, backed by the studies in 1.1. Do not turn it into "AI hallucinates"; the brand's own table says write "The model suggested 'wafer'", not "AI hallucination detected" (`design/system/README.md`) |
| "So it can't put words in your mouth." | Low | product.md's own claim ("can never put words in someone's mouth"). It is about the model; the dictionary's ranking only offers words that match, and the person chooses |
| "A model can help rank, if you turn it on." | Low | Keep "if you turn it on": model ranking sends data to a provider (product.md, honest limits) |
| "It finds the sentence." | Low | Says what it does, not how often it is right. Never "always", "knows what you mean" |
| "No signal? It still works." | Low | True after one visit; the description must say "after one visit" |
| "Every word it offered matched your keys." (Act 1) | Low | Describes the basic method and the film's own phone, as shown (`4663`: good, home, gone). Do not generalise to every historical product in the write-up without a source |
| "The story of a keypad that learned to talk." | Low | A metaphor. "Found its voice" would be worse: it drifts toward "gives you a voice" |
| "For an afternoon or for good" | Low | Can be misheard; keep the on-screen line |
| The bubble "Never mind." | Medium (tone) | People around the person are part of the audience (product.md). If it feels harsh, use a topic change ("So, how was work?") |
| The grey "suggested" chip | Medium (rules) | Must not look like any real keyboard, app or assistant (trademarks.md: no other apps' UI). Neutral grey, a plain label, no sparkle icon |
| "Its rules live in Kiro: specs, steering, hooks." (optional) | Medium | Only with a `KIRO_LOG.md` row behind each word. Never "Built with Kiro" or "Built in Kiro" for all the work (D15). 11's placeholder "Built in Kiro ... hooks that check every save" overclaims on both counts |
| The end card's "Built with Kiro for Kiroween 2026" | High | Conflicts with D15. Use "Made for Kiroween 2026", in the Kiro chapter |
| The app line "It is good to be back." (B) | Low | Could be heard as getting speech back; the context is the keypad. Fine |
| Rejected app lines | | "This is my voice" (decodes first, but reads as "gives you a voice", and in the app the voice is the device's); "I am still here" (decodes first, but reads as being about illness); "These are my words" and "It is still me" (the decoder ranks something else first) |
| First-person narration | High | Never. No user, no testimonial |

## 7. The app's lines, checked against the decoder

Ours: run on 2026-11-10 with the same code path as `film/scripts/build-data.ts` (`decodeGhost`, `encodeWord`,
`formatSentence` from `@ninth/core`, `data/lexicon/en.v1.json` and `en.bigram.v1.json`), from a scratch script that
writes nothing. The app ships `en.v2.json` with the same words (ADR-data-003). The film's build must add any new line
to `build-data.ts` so it fails if the first choice changes (production guide, section 5).

| Line | Keys | Decoder's top 3 | Use |
|---|---|---|---|
| Hello again | 43556 24246 | **Hello again**, Hello chain, Hello chaim | A, B |
| I need water | 4 6333 92837 | **I need water**, I need waves, I need yates | A, B |
| I have something to say | 4 4283 766384464 86 729 | **I have something to say**, ... to pay, ... to saw | A's ending |
| It is good to be back | 48 47 4663 86 23 2225 | **It is good to be back**, It is home ..., It is gone ... | B's ending |
| What did I miss | 9428 343 4 6477 | **What did I miss**, What die I miss, What did I nips | Spare: a returning keypad's joke, but it also sounds like being left out |
| Give me a minute / I am almost done / Let me finish | | all first | Spare, for a conversation beat |
| Old is not the same as bad | 653 47 668 843 7263 27 223 | **Old is not the same as bad**, ... as ace, ... as abe | Spare: the app could say the theme itself |
| Coffee please / Tea please | | both first | Spare |
| This is my voice / I am still here | | both first | Rejected (section 6) |
| These are my words | 84373 273 69 96737 | There are my words, **These are my words**, ... | Not first: do not use |
| It is still me | 48 47 78455 63 | It is still of, **It is still me**, ... | Not first: do not use |
| Let me say it | 538 63 729 48 | Let me saw it, **Let me say it**, ... | Not first: do not use |

## 8. What the narration needs from the picture

For the agents and the lead who own the picture; each item is a proposal.

1. **Act 1**: cut shot 3b (the worn key, about 1.9 s; the storyboard's own cut list allows it). Keys go dark at about
   0:16.0, the dusty phone at about 0:18.0, the switch-off at about 0:19.9. Scene 5 shows only the two lines the
   narrator says. The pixel captions change to the narrator's words (sections 4 and 5).
2. **Act 2, A**: a problem chapter of 16 s (bars 9 to 16) with the letter grid, the scan highlight, the other
   person's bubbles and the grey chip; 12's fold on bar 17; the They said line in the app showing "What do you need?";
   Speak at bar 21, the voice at bar 22. Captures only of the phone (no tablet). The Kiro cards say "Made for
   Kiroween 2026". The end card: the icon and name, the address, the intended-purpose sentence; nothing else.
3. **Act 2, B**: the problem in bars 1 to 8 (the Act 1 dot becomes the scan highlight), the fold on bar 9, "Hello
   again" at bar 13, the title at bar 14, the rest as A.
4. **Captions file**: add every narrator line with "Narrator:", keep "App voice:", keep the sound cues.
5. **Music**: room for speech while the narrator talks (14, section 4.5); keep the two dead stops for the app.
6. **Description**: the logline ("Ninth Life brings back 9-key predictive text as a free web app for typing to talk:
   press one key per letter and hear the sentence you meant. Every spoken word matches the keys you pressed."), the
   cited background of section 1.1, the offline result with its method, "works offline after one visit", the honest
   limits, the generated-audio note, and the intended-purpose sentence in full.

## 9. Not verified

- The live 2026 rules and judging page (403); its wording here is the repository's extract of 2026-11-06.
- Any video: none was watched. "Parisian Love", the audio-described version of "The Greatest" and its One Show award
  are search extracts.
- That the fax project won Resurrection in 2025 (its page says "Winner · AWS Global Hackathon").
- Higginbotham and Wilkins 1999 and Valencia et al. 2020 were not read; they are cited through Valencia et al. 2023.
- The NPR Training pages timed out; their advice is from search extracts. The broadcast "three words a second" rule
  is an extract from a textbook listing. The NCVS figure is second-hand (Lumen Learning).
- Martin and Nagalakshmi was read in part (the first two thirds of the page).
- The real length of each line in the chosen voice: measure every take (14's tools) before placing it.
- The decoder checks used `en.v1.json` as the film's build does; the app's `en.v2.json` has the same words.
- How judges or an automated reader weigh narration against on-screen text: no source found.

## Sources

Read on 2026-11-10 unless marked.

Research on the problem:

- Valencia, Cave, Kallarackal, Seaver, Terry and Kane. "The less I type, the better": How AI Language Models can
  Enhance or Impede Communication for AAC Users. CHI 2023. https://discovery.ucl.ac.uk/10185220/1/3544548.3581560.pdf
  (DOI 10.1145/3544548.3581560)
- Waller, Griffiths and Kristensson. "What I Think about When I Type about Talking": Reflections on Text-Entry
  Acceleration Interfaces. Communications of the ACM 68(5), May 2025. https://pokristensson.com/pubs/WallerEtAlCACM2025.pdf
  (DOI 10.1145/3703451)
- Cai et al. Using large language models to accelerate communication for eye gaze typing users. Nature Communications,
  2024. https://pmc.ncbi.nlm.nih.gov/articles/PMC11530652/
- Yusufali, Goetze and Moore. Bridging the Communication Rate Gap. HCII 2023.
  https://staffwww.dcs.shef.ac.uk/people/S.Goetze/papers/2023_Yusufali_HCII_Bridging_the_Communication_Rate_Gap_Enhancing_Text_Input_for_Augmentative_and_Alternative_Communication__AAC_.pdf
- Bonaker, Nel, Vertanen and Broderick. A Usability Study of Nomon: A Flexible Interface for Single-Switch Users.
  ASSETS 2023. https://par.nsf.gov/servlets/purl/10521368 (DOI 10.1145/3597638.3608415), citing Koester and Arthanat,
  Assistive Technology 30(3), 2018, and Koester and Simpson, JRRD 51(6), 2014
- Griffiths, Broomfield, Hrastelj, Judge and Toogood. AI, communication aids and the challenge of authentic
  authorship. Journal of Enabling Technologies 19(2), 2025.
  https://discovery.dundee.ac.uk/en/publications/ai-communication-aids-and-the-challenge-of-authentic-authorship-w/
  (abstract)
- Martin and Nagalakshmi. Aging Up AAC. arXiv 2404.17730v3. https://arxiv.org/html/2404.17730v3 (in part)
- AAC-RERC, project R4. https://rerc2009.aac-learning-center.org/archive_aac-rerc/pages/ProjectSite/R4.htm
- AssistiveWare. 7 ways to include AAC users in conversation.
  https://assistiveware.com/learn-aac/7-ways-to-include-aac-users-in-conversation
- Higginbotham and Wilkins. Slipping through the timestream (1999).
  https://www.oreilly.com/library/view/constructing-incompetence/9780805825909/xhtml/10_Chapter3.xhtml (Extract)
- Findlater et al. CHI 2017.
  https://makeabilitylab.cs.washington.edu/media/publications/Findlater_ComparingTouchscreenAndMouseInputPerformanceByPeopleWithAndWithoutUpperBodyMotorImpairments_CHI2017.pdf
  (via `docs/research/mobile-aac-evidence.md` E12)
- Finding & Funding AAC. Pennsylvania DHS Tech Accelerator for Assistive Technology.
  https://www.pa.gov/content/dam/copapwp-pagov/en/dhs/documents/pa-tech-accelerator-assistive-technology/06-finding-and-funding-aac-tech-accel.pdf
- ITU. Facts and Figures 2025, press release, 17 Nov 2025.
  https://www.itu.int/en/mediacentre/Pages/PR-2025-11-17-Facts-and-Figures.aspx

Story, judging and examples:

- Devpost. 6 tips for making a winning hackathon demo video. https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video
- RevenueCat. How to win Shipaton, part 4: pitching your app.
  https://www.revenuecat.com/blog/engineering/how-to-win-shipaton-part-4-pitching-your-app
- kiro.dev. This is Kiroween (2025). https://kiro.dev/blog/kiroween-2025/
- Kiroween 2026 rules. https://kiroween.devpost.com/rules (403; repository extracts used)
- Faxi. https://faxi.jp/en/
- The Ad Leaf. "Loretta": Kicking Ads & Taking Names, 12 Feb 2020. https://www.theadleaf.com/?p=6923
- MSU Today, 10 Feb 2020, article on the "Loretta" ad (address left out: it contains a phone maker's name)
- CNN Money, 8 Feb 2010, report on the "Parisian Love" ad (address left out; Extract)
- Cannes Lions, "We All Win". https://www.lovethework.com/work-awards/campaigns/we-all-win-585401 (title only); World
  Federation of Advertisers case note, 21 Apr 2020 (address left out)
- Television Academy award page for "The Greatest" (address left out); The One Show,
  https://www.oneclub.org/awards/theoneshow/-award/49499/ (Extract)
- Andy Hertzfeld. Intro Demo. https://www.folklore.org/Intro_Demo.html
- The competition organiser's developer blog, 21 Nov 2024, "Announcing the winners of the ... API Developer
  Competition" (address left out)
- No Film School. Tony Zhou and the "therefore / but" rule. https://nofilmschool.com/2015/04/tony-zhou-storytelling-video-essay-f-fake-therefore-but-and-then
- Laughing Squid. 22 rules of storytelling. https://laughingsquid.com/22-rules-of-storytelling/ (Extract)

Narration craft:

- Lumen Learning. Articulation, pitch and rate. https://courses.lumenlearning.com/wm-publicspeaking/chapter/articulation-pitch-and-rate/
- Broadcast Journalism, chapter 17. https://www.oreilly.com/library/view/broadcast-journalism-6th/9780240810249/xhtml/ch17.xhtml (Extract)
- Bread n Beyond. https://breadnbeyond.com/how-many-words-does-a-60-seconds-explainer-video-needs/ (Extract)
- NPR Training. https://www.npr.org/sections/npr-training/2025/05/31/g-s1-66074/would-you-say-it-that-way-tips-on-writing-for-your-voice
  and https://www.npr.org/sections/npr-training/2025/05/30/g-s1-65814/the-journey-from-print-to-radio-storytelling-a-guide-for-navigating-a-new-landscape (Extract)
- Wikipedia. J cut. https://en.wikipedia.org/wiki/J_cut
- Digital Learning Institute. Mayer's principles. https://www.digitallearninginstitute.com/blog/mayers-principles-multimedia-learning
- NUS. Mayer's 12 principles. https://medicine.nus.edu.sg/medixperience/scholarly-article/mayers-12-principles-of-multimedia-instruction/ (Extract)
- Netflix. English (USA) Timed Text Style Guide. https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- W3C. Understanding 1.2.2 and 1.2.3. https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html and
  https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html
- ElevenLabs. Text to speech best practices. https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- YouTube Help. Disclosing use of altered or synthetic content (address left out)

Repository: `.kiro/steering/product.md`, `privacy.md`, `trademarks.md`, `voice.md`; `.kiro/specs/marketing-site/content.md`;
`.agents/tasks/marketing-landing/decisions.md` (D14, D15); `packages/eval/RESULTS.md`; `docs/architecture/data-and-eval.md`;
`docs/research/mobile-aac-evidence.md`, `competitive-landscape.md`, `assumptions-register.md`; `docs/submission/DEVPOST.md`,
`VIDEO_SCRIPT.md`; `marketing/demo-video/01` to `06`; `film/src/data/decoded.json`, `voice.json`; this folder's 11, 12 and 14.
