import Head from 'next/head';
import dynamic from 'next/dynamic';

const GameWithNoSSR = dynamic(() => import('./Game'), { ssr: false });
export default function Home() {
  return (
    <>
      <Head>
        <title>Flappy Bird</title>
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <GameWithNoSSR />
      </main>
    </>
  );
};
