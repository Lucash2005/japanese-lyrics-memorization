import LyricsApp from "@/components/LyricsApp";
import sampleSong from "@/data/sampleSong.json";
import type { Song } from "@/types/lyrics";

export default function Home() {
  const song = sampleSong as Song;

  return (
    <div className="flex flex-1 flex-col">
      <LyricsApp song={song} />
    </div>
  );
}
