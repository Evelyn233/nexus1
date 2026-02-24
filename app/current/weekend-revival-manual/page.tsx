import Image from 'next/image'
import Link from 'next/link'

const sections = [
  {
    title: '1. Chongming Island｜An Experiment in Slow Time',
    description: [
      'Take the ferry from Baoyang Pier and cross the misty mouth of the Yangtze River. Chongming is not an island — it’s an extended breath.',
      'Watch the sunset at Dongtan Wetland; let the wind sift through the reeds until your thoughts are reduced to their purest form.',
      'Bring a book (perhaps Invisible Cities), and read under the pale light — as if reconciling with yourself.'
    ],
    image: '/images/weekend1.jpeg'
  },
  {
    title: '2. Xitang, Jiashan｜The Philosophy of Night',
    description: [
      'The night in this ancient town is not noisy; it’s solitude diluted by water.',
      'Lanterns drift on the canal — each one a flicker of contemplation.',
      'Stay alone in a riverside inn, brew a pot of oolong tea, and write a full page of purposeless words. Turn off notifications. Let time become dull again.'
    ],
    image: '/images/weekend2.jpeg'
  },
  {
    title: '3. Anji Bamboo Sea｜The Healing Power of Nature',
    description: [
      'While the AI world devours attention with speed, the bamboo forest teaches delayed reaction. In Anji, even sound softens.',
      'Try a simple breathing ritual: inhale and listen to the layers of wind; exhale and observe the shimmer of leaves.',
      'Gradually, sensation replaces thought.'
    ],
    image: '/images/weekend3.jpeg'
  },
  {
    title: '4. Zhujiajiao｜Introspection in Water',
    description: [
      'Sit by the stone bridge and let the tourists drift away. You’ll realize that the greatest luxury for city dwellers is not money, but the quiet circulation of self.',
      'If your heart still feels restless, listen to a live performance of traditional instruments or hand drums. The low-frequency vibration will remind you where your body truly begins.'
    ],
    image: '/images/weekend4.jpeg'
  },
  {
    title: '5. Rituals of Reconnection',
    description: [
      '📓 Bring a blank notebook — record only feelings, not tasks.',
      '🕯️ Light a stick of incense every night — allow emotions to move freely.',
      '☕ On Sunday morning, have a warm latte — it’s okay not to finish the news.',
      'The meaning of the weekend is not to escape life, but to return to the state where you can feel again. Let the world fall silent for three days — perhaps then, you’ll hear your inner voice once more.'
    ],
    image: '/images/weekend5.jpeg'
  }
]

export default function WeekendRevivalManual() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        <div className="space-y-6">
          <Link
            href="/profile"
            className="inline-flex items-center text-xs uppercase tracking-[0.3em] text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Home
          </Link>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl shadow-xl">
            <Image
              src="/images/weekend.jpeg"
              alt="Weekend Revival Manual cover"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white space-y-2">
              <span className="text-xs uppercase tracking-[0.4em] text-white/70">Weekend Manual</span>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Weekend Revival Manual
              </h1>
              <p className="text-sm text-white/80">
                Shanghai Escapes · A Guide to Creative Reset and Spiritual Recalibration
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            In this city, even the air carries the rhythm of calculation. Every soul is over-sensing, over-thinking, over-feeling.
            So the weekend is no longer just rest — it becomes a necessary act of spiritual withdrawal.
          </p>
        </div>

        <article className="space-y-12">
          {sections.map((section, index) => (
            <section key={index} className="flex flex-col md:flex-row gap-6 items-start">
              <div className="md:w-1/2 space-y-4">
                <h2 className="text-xl font-semibold text-primary">{section.title}</h2>
                {section.description.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="md:w-1/2 relative h-64 w-full rounded-lg overflow-hidden shadow-md">
                <Image
                  src={section.image}
                  alt={section.title}
                  fill
                  className="object-cover object-center"
                />
              </div>
            </section>
          ))}
        </article>

        <div className="space-y-3 border-t border-gray-200 pt-6">
          <Link
            href="/chat-new"
            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Generate your own life story →
          </Link>
          <form
            action="/chat-new"
            method="get"
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              name="prompt"
              required
              placeholder="Describe the moment you want to explore"
              className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              Open Chat
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

