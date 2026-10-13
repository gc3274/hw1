import { continueAsGuest } from "@/app/welcome/actions";
import GoogleSignInButton from "@/app/login/GoogleSignInButton";
import GradientText from "@/components/bits/GradientText";
import RotatingText from "@/components/bits/RotatingText";
import SplitText from "@/components/bits/SplitText";
import StarBorder from "@/components/bits/StarBorder";
import AuroraBackdrop from "@/components/fx/AuroraBackdrop";
import CursorTrail from "@/components/fx/CursorTrail";
import MagnetWrap from "@/components/fx/MagnetWrap";
import MotionSwap from "@/components/fx/MotionSwap";
import HeroPreview, { type PreviewCaption } from "./HeroPreview";
import { button } from "./ui";

const HEADLINE = "Make your camera roll";
const SUBJECTS = ["bodega cat", "subway mystery", "dorm view", "3am Butler"];
const STEPS = ["Snap a photo", "AI writes the jokes", "Everyone votes"];
const subjectChip = "inline-flex overflow-hidden rounded-lg bg-lime px-2 text-ink";

// Full-height title screen on /welcome for first-time signed-out visitors
export default function Hero({ preview }: { preview: PreviewCaption[] }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden"
    >
      <AuroraBackdrop />
      <CursorTrail />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-16 sm:px-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0">
          <StarBorder
            as="span"
            color="#c4ff3d"
            speed="5s"
            backgroundColor="rgb(8 8 12 / 0.7)"
            textColor="#f4f4f6"
            borderColor="rgb(255 255 255 / 0.12)"
            innerClassName="px-3.5 py-1.5 text-xs font-medium tracking-wide"
          >
            AI captions · Columbia &amp; NYC
          </StarBorder>

          <h1
            id="hero-heading"
            className="mt-6 font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance sm:text-7xl lg:text-8xl"
          >
            <span className="sr-only">Make your camera roll funny.</span>
            <span aria-hidden="true">
              <MotionSwap still={<span className="block">{HEADLINE}</span>}>
                <SplitText tag="span" text={HEADLINE} textAlign="left" className="block" />
              </MotionSwap>
              <span className="block animate-rise [animation-delay:900ms] motion-reduce:animate-none">
                <GradientText colors={["#c4ff3d", "#ff3ea5", "#a78bfa", "#c4ff3d"]} animationSpeed={6}>
                  funny.
                </GradientText>
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-fg/80 sm:text-xl">
            Snap the{" "}
            <MotionSwap still={<span className={subjectChip}>{SUBJECTS[0]}</span>}>
              <RotatingText
                texts={SUBJECTS}
                mainClassName={`${subjectChip} align-bottom`}
                splitLevelClassName="overflow-hidden pb-0.5"
                staggerFrom="last"
                staggerDuration={0.02}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2200}
              />
            </MotionSwap>
            . AI writes the jokes. Everyone votes.
          </p>

          <ol aria-label="How it works" className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step}
                style={{ animationDelay: `${1100 + i * 150}ms` }}
                className="flex animate-rise items-center gap-3 rounded-2xl border border-line bg-ink/50 px-4 py-3 backdrop-blur motion-reduce:animate-none"
              >
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime font-mono text-sm font-bold text-ink"
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <MagnetWrap>
              <div className="w-64">
                <GoogleSignInButton />
              </div>
            </MagnetWrap>
            {/* A plain form, so it works before (or without) JavaScript */}
            <form action={continueAsGuest}>
              <button type="submit" className={button("secondary")}>
                Look around as a guest <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        </div>

        {preview.length > 0 && <HeroPreview captions={preview} />}
      </div>
    </section>
  );
}
