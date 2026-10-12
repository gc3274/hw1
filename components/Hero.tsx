import Link from "next/link";
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
const subjectChip = "inline-flex overflow-hidden rounded-lg bg-lime px-2 text-ink";

// Full-height title screen for signed-out visitors, with the feed right below
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
            <MotionSwap still={<span className="block">{HEADLINE}</span>}>
              <SplitText tag="span" text={HEADLINE} textAlign="left" className="block" />
            </MotionSwap>
            <span className="block animate-rise [animation-delay:900ms] motion-reduce:animate-none">
              <GradientText colors={["#c4ff3d", "#ff3ea5", "#a78bfa", "#c4ff3d"]} animationSpeed={6}>
                funny.
              </GradientText>
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

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <MagnetWrap>
              <Link href="/login" className={button("primary")}>
                Sign in with Google
              </Link>
            </MagnetWrap>
            <a href="#feed" className={button("secondary")}>
              See the feed <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {preview.length > 0 && <HeroPreview captions={preview} />}
      </div>

      <span
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-2xl text-muted motion-reduce:animate-none"
      >
        ↓
      </span>
    </section>
  );
}
