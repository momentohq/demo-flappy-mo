'use client';
import { useEffect, useState, useRef } from 'react';
import { TopicClient, CredentialProvider } from '@gomomento/sdk-web';
import styles from './Game.module.css';

export default function Game() {
  const [topicSub, setTopicSub] = useState(null);
  const [topicClient, setTopicClient] = useState(null);

  const pipeHeights = [100, 130, 150, 200, 60, 220, 250, 340, 270, 80, 300];
  const boardWidth = 360;
  const boardHeight = 640;
  const gravity = 0.4;
  const jump = -8;
  const pipeWidth = 52;
  const pipeGap = 150;
  const pipeInterval = 2000;
  const gameSpeed = -2;

  const birdInitial = useRef({
    x: boardWidth / 8,
    y: boardHeight / 2,
    width: 34,
    height: 24,
    velocityY: 0,
    img: null,
  });

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(true);
  const [waitingForNextGame, setWaitingForNextGame] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const gameLoopRef = useRef(null);
  const canvasRef = useRef(null);
  const pipesRef = useRef([]);
  const lastPipeHeightRef = useRef(boardHeight / 2);
  const topPipeImg = useRef(null);
  const bottomPipeImg = useRef(null);

  useEffect(() => {
    const birdImg = new Image();
    birdImg.src = "./flappybird.png";
    birdImg.onload = () => {
      birdInitial.current.img = birdImg;
      setScore((score) => score); // Trigger a re-render
    };

    const topImg = new Image();
    topImg.src = "./toppipe.png";
    topImg.onload = () => topPipeImg.current = topImg;

    const bottomImg = new Image();
    bottomImg.src = "./bottompipe.png";
    bottomImg.onload = () => bottomPipeImg.current = bottomImg;

    if (window !== 'undefined') {
      const topics = new TopicClient({
        credentialProvider: CredentialProvider.fromString(process.env.NEXT_PUBLIC_api_key)
      });

      setTopicClient(topics);
    }
  }, [window]);

  useEffect(() => {
    subscribeToGame();
  }, [topicClient]);

  const subscribeToGame = async () => {
    if (topicClient && !topicSub) {
      const subscription = await topicClient.subscribe(process.env.NEXT_PUBLIC_cacheName, process.env.NEXT_PUBLIC_topicName, {
        onItem: async (data) => processMessage(data.value()),
        onError: (err) => console.error(err)
      });
      setTopicSub(subscription);
    }
  };

  const processMessage = (message) => {
    const msg = JSON.parse(message);
    switch (msg.event) {
      case 'start-game':
        if (gameOver) {
          resetGame();
        }
        break;
    }
  };

  useEffect(() => {
    if (!gameOver && countdown === null) {
      const generatePipes = () => {
        const scoreIndex = score + (lastPipeHeightRef.current ?? 0) % pipeHeights.length;
        const topPipeHeight = pipeHeights[scoreIndex];
        const dynamicPipeGap = Math.max(pipeGap - score * 2, 120);
        lastPipeHeightRef.current = topPipeHeight;

        const bottomPipeHeight = boardHeight - topPipeHeight - dynamicPipeGap;
        console.log(bottomPipeHeight);
        pipesRef.current.push({
          topPipeHeight,
          bottomPipeHeight,
          x: boardWidth,
          scored: false,
        });
      };
      const pipesGenerator = setInterval(generatePipes, pipeInterval);
      return () => clearInterval(pipesGenerator);
    }
  }, [gameOver, countdown]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(updateGame);
    setWaitingForNextGame(gameOver);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameOver]);

  const updateGame = () => {
    if (!canvasRef.current || !birdInitial.current.img || gameOver || countdown !== null) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, boardWidth, boardHeight);

    // Update and draw bird
    const bird = birdInitial.current;
    bird.velocityY += gravity;
    bird.y = Math.max(bird.y + bird.velocityY, 0);
    ctx.drawImage(bird.img, bird.x, bird.y, bird.width, bird.height);

    // Update and draw pipes
    pipesRef.current.forEach((pipe) => {
      pipe.x += gameSpeed;
      // Draw top pipe
      if (topPipeImg.current) {
        ctx.drawImage(topPipeImg.current, pipe.x, 0, pipeWidth, pipe.topPipeHeight);
      }

      // Draw bottom pipe
      if (bottomPipeImg.current) {
        ctx.drawImage(bottomPipeImg.current, pipe.x, boardHeight - pipe.bottomPipeHeight, pipeWidth, pipe.bottomPipeHeight);
      }

      // Check for score update
      if (!pipe.scored && pipe.x + pipeWidth < bird.x) {
        pipe.scored = true;
        setScore((prevScore) => prevScore + 1);
      }
    });

    // Remove off-screen pipes
    pipesRef.current = pipesRef.current.filter(pipe => pipe.x + pipeWidth > 0);

    // Check for collisions
    if (checkCollision(bird) || bird.y + bird.height >= boardHeight) {
      setGameOver(true);
      return;
    }

    gameLoopRef.current = requestAnimationFrame(updateGame);
  };

  const checkCollision = (bird) => {
    for (let pipe of pipesRef.current) {
      if (
        bird.x < pipe.x + pipeWidth &&
        bird.x + bird.width > pipe.x &&
        (bird.y < pipe.topPipeHeight || bird.y + bird.height > boardHeight - pipe.bottomPipeHeight)
      ) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        if (!gameOver) {
          birdInitial.current.velocityY = jump;
        } else {
          resetGame();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); };
  }, [gameOver]);

  const resetGame = () => {
    birdInitial.current = { ...birdInitial.current, y: boardHeight / 2, velocityY: 0 };
    pipesRef.current = [];
    lastPipeHeightRef.current = boardHeight / 2;
    setScore(0);
    setWaitingForNextGame(false);
    setCountdown(3);
  };

  useEffect(() => {
    let countdownTimer = null;
    if (countdown > 0) {
      countdownTimer = setTimeout(() => {
        setCountdown(currentCountdown => currentCountdown - 1);
      }, 1000);

    } else if (countdown === 0) {
      countdownTimer = setTimeout(() => {
        setCountdown(null);
        setGameOver(false);
      }, 1000);
    }
    return () => clearTimeout(countdownTimer);
  }, [countdown]);

  return (
    <>
      <canvas ref={canvasRef} width={boardWidth} height={boardHeight} className="bg-cover" style={{ backgroundImage: 'url(./flappybirdbg.png)' }}></canvas>
      {countdown !== null && (
        <div key={countdown} className={styles.countdown}>
          {countdown > 0 ? countdown : "Go!"}
        </div>
      )}
      {waitingForNextGame && <div className="absolute text-xl text-white text-center">Waiting for <br />next game...</div>}
    </>
  );
};

