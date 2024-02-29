# Flappy Mo - A Browser-Based Multiplayer Game

Flappy Mo is a multiplayer arcade-style game inspired by the viral hit Flappy Bird, with a twist - instead of navigating a bird, players guide Momento's mascot Mo through scrolling pipes. This game introduces a competitive multiplayer experience, allowing friends to compete in real time.

## Features

- **Multiplayer Gameplay:** Compete against friends in real-time.
- **Authentication:** Simple, no sign-up required. Unique identification via temporary auth tokens.
- **Remote Start:** Synchronized game starts for all players for a unified gaming experience.
- **Session Synchronization:** Real-time player position updates across all game instances.
- **Dynamic Game Rounds:** Game parameters (gravity, jump height, pipe spacing, game speed) are randomized for each round.
- **In-Browser Technology:** Powered by Momento Cache and Topics services for seamless multiplayer interaction and state synchronization.

## Architecture Overview

The game leverages Momento's caching and pub/sub services to handle player tracking, session synchronization, and real-time updates, minimizing the backend workload and enabling quick development.

![Architecture diagram](/public/architecture.png)

## Getting Started

### Prerequisites

- A web browser with JavaScript enabled.
- No sign-up or login required.

### How to Play

- Visit the [game website](https://gdc.momentolabs.io)
- Enter a username to get started.
- Use your mouse click or spacebar to jump, or tap the screen on mobile devices.
- Rounds start every 30 seconds. Be prepared for the game to begin!

## Development

This project uses Next.js for the frontend and a Node.js Lambda function for the remote start feature. Momento's services handle the multiplayer logic and game state synchronization.

### Deployment

To deploy the remote start function into your AWS account, you must first have the AWS CLI installed and configured on your machine and the SAM CLI installed. To deploy into your account, run the following commands in a terminal:

```bash
cd _aws
sam build
sam deploy --guided
```

Follow the wizard to deploy into your account.

### Running locally

To run the user interface locally, you must have Next.js installed on your machine. After installation, you can run the following commands:

```bash
npm install
npm run dev
```

The game should start running locally and be available at `http://localhost:3000`. This mode runs the server with hot reloads, meaning any changes you make will automatically update the local server without restarting.

*NOTE - You only need to run the `npm install` command one time. For subsequent local runs, you only need the `npm run dev` command.*

### Customization

Feel free to fork the GitHub repository to make your own modifications. Whether you're looking to tweak the game mechanics or add new features, the code is open for you to explore and adapt.

## Support

If you have questions or would like to discuss game development ideas, join our Discord community. For more technical details on building games with Momento, check out our gaming documentation.

## Contribute

Contributions are welcome! If you'd like to improve Flappy Mo or add new features, please feel free to submit a pull request.

## Acknowledgments

- The original Flappy Bird game for inspiration.

Happy coding and gaming!
