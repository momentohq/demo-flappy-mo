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

  const moInitial = useRef({
    x: boardWidth / 8,
    y: boardHeight / 2,
    width: 34, // landscape is 34
    height: 41, // landscape is 24
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
  const [isPlayerDead, setIsPlayerDead] = useState(false);
  const isPlayerDeadRef = useRef(isPlayerDead);
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
    const playerImg = new Image();
    playerImg.src = "./mo.png";
    playerImg.onload = () => {
      moInitial.current.img = playerImg;
      setScore((score) => score); // Trigger a re-render
      scoreRef.current = score;
    };

    const topImg = new Image();
    topImg.src = "./toppipe.png";
    topImg.onload = () => topPipeImg.current = topImg;

    const bottomImg = new Image();
    bottomImg.src = "./bottompipe.png";
    bottomImg.onload = () => bottomPipeImg.current = bottomImg;
  }, []);

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
      case 'player-moved':
        if (tokenId !== username) {
          console.log('updating player movements', msg.y, msg.velocityY);
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
    if (!canvasRef.current || !moInitial.current.img || gameOverRef.current || countdown !== null) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, boardWidth, boardHeight);

    // Update and draw opponents
    ctx.globalAlpha = .65;
    for (const opp of playersRef.current.filter(p => p.username !== username && p.isActive)) {
      opp.velocityY += currentGameSettings.current.gravity;
      opp.y = Math.max(opp.y + opp.velocityY, 0);
      ctx.drawImage(opp.img, opp.x, opp.y, opp.width, opp.height);
      ctx.fillText(opp.username, opp.x + 7, opp.y + 52);
      if (checkCollision(opp)) {
        opp.isActive = false;
      }
    }
    ctx.globalAlpha = 1.0;

    const mo = moInitial.current;

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
      if (!pipe.scored && pipe.x + pipeWidth < mo.x) {
        pipe.scored = true;
        if (!isPlayerDeadRef.current) {
          setScore((prevScore) => prevScore + 1);
          scoreRef.current = scoreRef.current + 1;
        }
      }
    });

    if (!isPlayerDeadRef.current) {
      mo.velocityY += currentGameSettings.current.gravity;
      mo.y = Math.max(mo.y + mo.velocityY, 0);
      ctx.drawImage(mo.img, mo.x, mo.y, mo.width, mo.height);
      ctx.fillText('you', mo.x + 7, mo.y + 52);
    } else {
      // display text here for you died.
      ctx.font = "25px Inter";
      ctx.fillStyle = "white";
      ctx.fillText('You lost ☹️', (boardWidth / 2) - 60, 60);
    }

    // Remove off-screen pipes
    pipesRef.current = pipesRef.current.filter(pipe => pipe.x + pipeWidth > 0);

    // Display on-screen data
    ctx.font = "14px Inter";
    ctx.fillStyle = 'black';
    ctx.fillText(`Players: ${playersRef.current.length}`, 5, 15);
    ctx.fillText(`Score: ${scoreRef.current}`, 295, 15);

    ctx.fillText(`Gravity: ${GameProps.gravity(currentGameSettings.current.gravity)}`, 5, 610);
    ctx.fillText(`Jump: ${GameProps.jump(currentGameSettings.current.jump)}`, 5, 630);
    ctx.fillText(`Speed: ${GameProps.speed(currentGameSettings.current.gameSpeed)}`, 245, 610);
    ctx.fillText(`Pipes: ${GameProps.pipes(currentGameSettings.current.pipeGap)}`, 245, 630);

    // Check for collisions
    if (checkCollision(mo) || mo.y + mo.height >= boardHeight) {
      setIsPlayerDead(true);
      isPlayerDeadRef.current = true;
    }

    const activePlayers = playersRef.current.filter(p => p.username !== username && p.isActive);
    if (isPlayerDeadRef.current && !activePlayers.length) {
      setGameOver(true);
      gameOverRef.current = true;
      return;
    }

    gameLoopRef.current = requestAnimationFrame(updateGame);
  };

  const checkCollision = (player) => {
    for (let pipe of pipesRef.current) {
      if (
        player.x < pipe.x + pipeWidth &&
        player.x + player.width > pipe.x &&
        (player.y < pipe.topPipeHeight || player.y + player.height > boardHeight - pipe.bottomPipeHeight)
      ) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault();
      if (e.code === "Space" && countdown === null && !isPlayerDeadRef.current) {
        moInitial.current.velocityY = currentGameSettings.current.jump;
        topicClientRef.current.publish(process.env.NEXT_PUBLIC_cacheName, process.env.NEXT_PUBLIC_topicName,
          JSON.stringify({ event: 'player-moved', velocityY: moInitial.current.velocityY, y: moInitial.current.y, isActive: true }));
      }
    };

    const handleClick = (e) => {
      if (countdown === null) {
        if (!isPlayerDeadRef.current) {
          moInitial.current.velocityY = currentGameSettings.current.jump;
          topicClientRef.current.publish(process.env.NEXT_PUBLIC_cacheName, process.env.NEXT_PUBLIC_topicName,
            JSON.stringify({ event: 'player-moved', velocityY: moInitial.current.velocityY, y: moInitial.current.y, isActive: true }));
        }
        // else {
        //   resetGame();
        // }
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
    moInitial.current = { ...moInitial.current, y: boardHeight / 2, velocityY: 0 };
    updatePlayers();
    setIsPlayerDead(false);
    isPlayerDeadRef.current = false;

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
        const opponents = players.value().map(p => {
          return {
            ...moInitial.current,
            y: boardHeight / 2,
            velocityY: 0,
            isActive: true,
            username: p
          };
        });
        setPlayers(opponents);
        playersRef.current = opponents;
        console.log(opponents);
      }
    }
  };

  const updatePlayerMovement = (username, y, velocityY) => {
    const updatedPlayers = playersRef.current.map(p => {
      if (p.username == username) {
        return { ...p, y, velocityY };
      } else {
        return p;
      }
    });

    setPlayers(updatedPlayers);
    playersRef.current = updatedPlayers;
  };

  useEffect(() => {
    if (authToken && window !== 'undefined') {
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

      // Adding the event listener
      window.addEventListener('beforeunload', updateSession);
      updateSession(false);

      // Removing the event listener on cleanup
      return () => {
        window.removeEventListener('beforeunload', updateSession);
      };
    }
  }, [authToken]);

  const updateSession = async (shouldLeave = true) => {
    var blob = new Blob([JSON.stringify({ token: authToken, shouldLeave })], { type: 'application/json; charset=UTF-8' });
    navigator.sendBeacon('/api/sessions', blob);

    topicSub?.unsubscribe();
  };

  return (
    <>
      <canvas ref={canvasRef} width={boardWidth} height={boardHeight} style={{ backgroundImage: 'url(./flappybirdbg.png)' }}></canvas>
      {countdown !== null && (
        <div key={countdown} className={styles.countdown}>
          {countdown > 0 ? countdown : "Go!"}
        </div>
      )}
      {waitingForNextGame && <div className="absolute text-xl text-white text-center select-none">Waiting for <br />next game...</div>}
    </>
  );
};

