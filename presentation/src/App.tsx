import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Shell } from "@/components/shell/Shell";
import { VideoStage } from "@/components/video/VideoStage";
import { registerSlides, useSlideStore } from "@/state/useSlideStore";
import { slides } from "@/slides";
import { fadeScale } from "@/lib/motion";

export default function App() {
  const { index, slides: registered, playMode } = useSlideStore();

  useEffect(() => {
    registerSlides(
      slides.map(({ id, kicker, title, chapter }) => ({
        id,
        kicker,
        title,
        chapter,
      }))
    );
  }, []);

  if (registered.length === 0) return null;

  const Scene = slides[index]?.Scene;

  return (
    <>
      <Shell>{Scene ? <Scene /> : null}</Shell>
      <AnimatePresence>
        {playMode && (
          <motion.div
            className="fixed inset-0 z-40"
            variants={fadeScale}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <VideoStage />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
