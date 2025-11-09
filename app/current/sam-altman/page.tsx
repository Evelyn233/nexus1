import Image from 'next/image'
import Link from 'next/link'

export default function SamAltmanFeature() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        <div className="space-y-6">
          <Link
            href="/home"
            className="inline-flex items-center text-xs uppercase tracking-[0.3em] text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Home
          </Link>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl shadow-xl">
            <Image
              src="/images/samfeng.webp"
              alt="Sam Altman feature cover"
              fill
              className="object-cover object-top"
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white space-y-2">
              <span className="text-xs uppercase tracking-[0.4em] text-white/70">
                Current Feature
              </span>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Sam Altman: The Last Human CEO?
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-gray-500">
            <span>Live Brief</span>
            <span className="h-3 w-px bg-gray-300" />
            <span>Realtime Lens</span>
            <span className="h-3 w-px bg-gray-300" />
            <span>AI Current</span>
          </div>
        </div>

        <article className="prose prose-sm md:prose-base max-w-none prose-p:text-gray-700 prose-headings:tracking-tight prose-headings:text-gray-900">
          <section className="space-y-4">
            <h2>Chapter I · The Declaration on Stage</h2>
            <p>
              The story begins not with a technological breakthrough, but with a moment of personal
              fortitude. In the quiet auditorium of an elite preparatory school in the early 2000s
              Midwest, a young, determined figure stood under a single spotlight. This was his first
              public declaration — not of a company, but of himself. By announcing his identity and
              advocating for “Safe Space” support, he fundamentally altered the school&apos;s
              culture.
            </p>
            <p>
              That act of confronting silence and demanding acceptance foreshadowed a future
              leadership style: disrupting established norms to create new, open environments. The
              light of that spotlight became a beacon for change, setting the tone for a career that
              would be defined by massive technological disruption.
            </p>
          </section>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg my-10">
            <Image
              src="/images/sam1.png"
              alt="Sam Altman speaking confidently on stage in his early years"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>

          <section className="space-y-4">
            <h2>Chapter II · The Algorithm of the Poker Table</h2>
            <p>
              After dropping out of Stanford, he plunged into the startup world, co-founding Loopt,
              a location-based social app. Though the venture eventually sold without achieving true
              scale, his real education during this period took place at high-stakes poker tables.
            </p>
            <p>
              Under dim lights, he mastered the art of making decisions with imperfect information
              and intently studying human patterns — skills that would become invaluable in venture
              capital. This analytical approach, blending psychological insights with strategic risk
              (symbolized by a subtle digital map glowing beneath the poker chips), became the
              foundation for spotting generational companies. The failure of Loopt was merely
              tuition for an apprenticeship in pattern recognition.
            </p>
          </section>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg my-10">
            <Image
              src="/images/sam2.jpeg"
              alt="Sam Altman at a poker table with data visualizations overlayed"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>

          <section className="space-y-4">
            <h2>Chapter III · The Architect of the Accelerator</h2>
            <p>
              In 2014, he took the helm of Y Combinator, transforming it from a successful incubator
              into a systematic structure for mass innovation. His focus shifted from a simple
              launchpad to a complex architectural lattice dedicated to systematizing how ideas
              become viable businesses.
            </p>
            <p>
              He saw himself not as an investor, but as an architect of scale, placing thousands of
              glowing startup concepts into the framework of the program. By pushing the accelerator
              to embrace hard technology and expanding its scope exponentially, he cemented YC as
              the preeminent engine for building the modern digital economy.
            </p>
          </section>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg my-10">
            <Image
              src="/images/sam3.png"
              alt="Sam Altman at Y Combinator surrounded by illuminated startup models"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>

          <section className="space-y-4">
            <h2>Chapter IV · The Surge and the Schism</h2>
            <p>
              The ultimate challenge arrived with the co-founding of OpenAI, focused on creating AGI
              for the benefit of humanity — a task he likened to the Manhattan Project. The launch
              of ChatGPT unleashed a blinding white light of capability across the globe, speeding up
              the timeline for superintelligence and prompting world leaders to convene emergency
              safety summits.
            </p>
            <p>
              Standing composed before a luminous, AI-symbolizing orb, he grappled with the tension
              between technological acceleration and safe governance. The dramatic corporate turmoil
              of late 2023, symbolized by broken chess pieces scattered near his feet, revealed the
              fragility of the governance model. His eventual return underscored his immense personal
              leverage. He now stands at the nexus of the future, a thoughtful architect whose every
              move must balance the power of the intelligence he helped unleash against the volatile
              human element of control.
            </p>
          </section>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg my-10">
            <Image
              src="/images/sam4.jpg"
              alt="Sam Altman illuminated by a futuristic holographic orb"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>
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


