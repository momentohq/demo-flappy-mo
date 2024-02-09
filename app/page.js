'use client';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const GameWithNoSSR = dynamic(() => import('./Game'), { ssr: false });

export default function Home() {
  const [username, setUsername] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const savedUsername = localStorage?.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      router.push('/login');
    }
  }, []);

  useEffect(() => {
    const getToken = async () => {
      const response = await fetch(`/api/tokens?user=${username}`);
      if(response.ok){
        const data = await response.json();
        setAuthToken(data.token);
      }
    };

    if (username) {
      getToken();
    }
  }, [username]);


  return (
    <>
      <Head>
        <title>Flappy Bird</title>
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <GameWithNoSSR authToken={authToken} />
      </main>
    </>
  );
};
