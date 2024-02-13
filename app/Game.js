'use client';
import { useEffect, useState, useRef } from 'react';
import { TopicClient, CredentialProvider, CacheClient, CacheSetFetch } from '@gomomento/sdk-web';
import styles from './Game.module.css';
import { GameProps } from '@/utils/gamedata';

export default function Game({ authToken }) {
  const [topicSub, setTopicSub] = useState(null);
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const cacheClientRef = useRef(cacheClient);
  const topicClientRef = useRef(topicClient);

  const pipeHeights = [100, 130, 150, 200, 60, 220, 250, 340, 270, 80, 300];
  const boardWidth = 360;
  const boardHeight = 640;
  const pipeWidth = 52;
  const pipeInterval = 2000;

  const defaultGameSettings = {
    gravity: 0.4,
    jump: -8,
    gameSpeed: -2,
    pipeGap: 150
  };

  const birdInitial = useRef({
    x: boardWidth / 8,
    y: boardHeight / 2,
    width: 34,
    height: 24,
    velocityY: 0,
    img: null,
  });

  const [gameSettings, setGameSettings] = useState(defaultGameSettings);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(true);
  const [waitingForNextGame, setWaitingForNextGame] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [players, setPlayers] = useState([]);
  const [username, setUsername] = useState(null);
  const gameLoopRef = useRef(null);
  const canvasRef = useRef(null);
  const pipesRef = useRef([]);
  const lastPipeHeightRef = useRef(boardHeight / 2);
  const topPipeImg = useRef(null);
  const bottomPipeImg = useRef(null);
  const currentGameSettings = useRef(gameSettings);
  const playersRef = useRef(players);
  const gameOverRef = useRef(gameOver);
  const scoreRef = useRef(score);

  useEffect(() => {
    const birdImg = new Image();
    birdImg.src = "./flappybird.png";
    birdImg.onload = () => {
      birdInitial.current.img = birdImg;
      setScore((score) => score); // Trigger a re-render
      scoreRef.current = score;
    };

    const topImg = new Image();
    topImg.src = "./toppipe.png";
    topImg.onload = () => topPipeImg.current = topImg;

    const bottomImg = new Image();
    bottomImg.src = "./bottompipe.png";
    bottomImg.onload = () => bottomPipeImg.current = bottomImg;

    if (window !== 'undefined' && authToken) {
      const topics = new TopicClient({
        credentialProvider: CredentialProvider.fromString(authToken)
      });
      setTopicClient(topics);
      topicClientRef.current = topics;

      const cache = new CacheClient({
        defaultTtlSeconds: 300,
        credentialProvider: CredentialProvider.fromString(authToken)
      });
      setCacheClient(cache);
      cacheClientRef.current = cache;

      const savedUsername = localStorage.getItem('username');
      setUsername(savedUsername);
    }


  }, [window, authToken]);

  useEffect(() => {
    subscribeToGame();
  }, [topicClient]);

  const subscribeToGame = async () => {
    if (topicClient && !topicSub) {
      const subscription = await topicClient.subscribe(process.env.NEXT_PUBLIC_cacheName, process.env.NEXT_PUBLIC_topicName, {
        onItem: async (data) => processMessage(data.value(), data.tokenId()),
        onError: (err) => console.error(err)
      });
      setTopicSub(subscription);
    }
  };

  const processMessage = (message, tokenId) => {
    const msg = JSON.parse(message);
    console.log(message, tokenId);
    switch (msg.event) {
      case 'start-game':
        if (gameOverRef.current) {
          resetGame();
          updateGameSettings(msg.gameProperties);
        }
        break;
      case 'players-changed':
        updatePlayers();
        break;
      case 'player-moved':
        if (tokenId !== username) {
          updatePlayerMovement(tokenId, msg.y, msg.velocityY, msg.isActive);
        }
        break;
    }
  };

  useEffect(() => {
    if (!gameOverRef.current && countdown === null) {
      const generatePipes = () => {
        const scoreIndex = score + (lastPipeHeightRef.current ?? 0) % pipeHeights.length;
        const topPipeHeight = pipeHeights[scoreIndex];
        const dynamicPipeGap = Math.max(currentGameSettings.current.pipeGap - score * 2, 120);
        lastPipeHeightRef.current = topPipeHeight;

        const bottomPipeHeight = boardHeight - topPipeHeight - dynamicPipeGap;
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
    if (!canvasRef.current || !birdInitial.current.img || gameOverRef.current || countdown !== null) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, boardWidth, boardHeight);

    // Update and draw bird
    const bird = birdInitial.current;
    bird.velocityY += currentGameSettings.current.gravity;
    bird.y = Math.max(bird.y + bird.velocityY, 0);
    ctx.drawImage(bird.img, bird.x, bird.y, bird.width, bird.height);
    ctx.fillText('you', bird.x + 5, bird.y + 40);

    // Update and draw opponents
    for (const opp of playersRef.current.filter(p => p.username !== username && p.isActive)) {
      opp.velocityY += currentGameSettings.current.gravity;
      opp.y = Math.max(opp.y + opp.velocityY, 0);
      ctx.drawImage(opp.img, opp.x, opp.y, opp.width, opp.height);
      ctx.fillText(opp.username, opp.x + 5, opp.y + 40);
      if (checkCollision(opp)) {
        opp.isActive = false;
      }
    }
    // Update and draw pipes
    pipesRef.current.forEach((pipe) => {
      pipe.x += currentGameSettings.current.gameSpeed;
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
        scoreRef.current = scoreRef.current + 1;
      }
    });

    // Remove off-screen pipes
    pipesRef.current = pipesRef.current.filter(pipe => pipe.x + pipeWidth > 0);

    // Check for collisions
    if (checkCollision(bird) || bird.y + bird.height >= boardHeight) {
      setGameOver(true);
      gameOverRef.current = true;
      return;
    }

    // Display on-screen data
    ctx.font = "14px Inter";
    ctx.fillStyle = 'black';
    ctx.fillText(`Players: ${playersRef.current.length}`, 5, 15);
    ctx.fillText(`Score: ${scoreRef.current}`, 295, 15);

    ctx.fillText(`Gravity: ${GameProps.gravity(currentGameSettings.current.gravity)}`, 5, 610);
    ctx.fillText(`Jump: ${GameProps.jump(currentGameSettings.current.jump)}`, 5, 630);
    ctx.fillText(`Speed: ${GameProps.speed(currentGameSettings.current.gameSpeed)}`, 245, 610);
    ctx.fillText(`Pipes: ${GameProps.pipes(currentGameSettings.current.pipeGap)}`, 245, 630);
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
      e.preventDefault();
      if (e.code === "Space" && countdown === null) {
        if (!gameOverRef.current) {
          birdInitial.current.velocityY = currentGameSettings.current.jump;
          topicClientRef.current.publish(process.env.NEXT_PUBLIC_cacheName, process.env.NEXT_PUBLIC_topicName,
            JSON.stringify({ event: 'player-moved', velocityY: birdInitial.current.velocityY, y: birdInitial.current.y, isActive: true }));
        } else {
          resetGame();
        }
      }
    };

    const handleClick = (e) => {
      //To make this not reset during the countdown the countdown needs to be a ref and checked here.
      if (countdown === null) {
        if (!gameOverRef.current) {
          birdInitial.current.velocityY = currentGameSettings.current.jump;
          topicClientRef.current.publish(process.env.NEXT_PUBLIC_cacheName, process.env.NEXT_PUBLIC_topicName,
            JSON.stringify({ event: 'player-moved', velocityY: birdInitial.current.velocityY, y: birdInitial.current.y, isActive: true }));
        } else {
          resetGame();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, [gameOver]);

  const resetGame = () => {
    birdInitial.current = { ...birdInitial.current, y: boardHeight / 2, velocityY: 0 };
    const opponents = players.map(p => {
      return {
        ...p,
        y: boardHeight / 2,
        velocityY: 0,
        isActive: true
      };
    });
    setPlayers(opponents);
    playersRef.current = opponents;

    pipesRef.current = [];
    lastPipeHeightRef.current = boardHeight / 2;
    setScore(0);
    scoreRef.current = 0;
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
        gameOverRef.current = false;
      }, 1000);
    }
    return () => clearTimeout(countdownTimer);
  }, [countdown]);

  const updateGameSettings = (settings) => {
    setGameSettings(settings);
    currentGameSettings.current = settings;
  };

  const updatePlayers = async () => {
    if (!cacheClientRef.current) {
      console.warn('Cache client not set');
    } else {
      const players = await cacheClientRef.current.setFetch(process.env.NEXT_PUBLIC_cacheName, 'players');
      if (players instanceof CacheSetFetch.Hit) {
        const playerList = players.value().map(p => {
          return {
            ...birdInitial.current,
            username: p,
            isActive: false
          };
        });

        playersRef.current = playerList;
        setPlayers(playerList);
      }
    }
  };

  const updatePlayerMovement = (username, y, velocityY, isActive) => {
    const updatedPlayers = players.map(p => {
      if (p.username == username) {
        return { ...p, y, velocityY, isActive };
      } else {
        return p;
      }
    });

    setPlayers(updatedPlayers);
    playersRef.current = updatedPlayers;
  };

  useEffect(() => {
    if (authToken) {

      const updateSession = async (shouldLeave = true) => {
        var blob = new Blob([JSON.stringify({ token: authToken, shouldLeave })], { type: 'application/json; charset=UTF-8' });
        navigator.sendBeacon('/api/sessions', blob);

      };

      // Adding the event listener
      window.addEventListener('beforeunload', updateSession);
      updateSession(false);

      // Removing the event listener on cleanup
      return () => {
        window.removeEventListener('beforeunload', updateSession);
      };
    }
  }, [authToken]);

  return (
    <>
      <canvas ref={canvasRef} width={boardWidth} height={boardHeight} style={{ backgroundImage: 'url(./flappybirdbg.png)' }}></canvas>
      {countdown !== null && (
        <div key={countdown} className={styles.countdown}>
          {countdown > 0 ? countdown : "Go!"}
        </div>
      )}
      {waitingForNextGame && <div className="absolute text-xl text-white text-center">Waiting for <br />next game...</div>}
    </>
  );
};

