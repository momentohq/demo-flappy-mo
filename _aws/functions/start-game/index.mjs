import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { TopicClient, CredentialProvider } from '@gomomento/sdk';

let topicClient;
export const handler = async (event) => {
  if (!topicClient) {
    await initializeTopicClient();
  }

  await topicClient.publish(process.env.CACHE_NAME, process.env.TOPIC_NAME, JSON.stringify(
    {
      event: 'start-game',
      gameProperties: {
        gravity: getRandomNumberInRange(.3, .5, 1),
        jump: getRandomNumberInRange(-10, -6),
        gameSpeed: getRandomNumberInRange(-1, -4),
        pipeGap: getRandomNumberInRange(50, 200)
      }
    }));
};

const initializeTopicClient = async () => {
  const secret = await getSecret(process.env.SECRET_ID, { transform: 'json' });
  topicClient = new TopicClient({
    credentialProvider: CredentialProvider.fromString(secret.momento)
  });
};

const getRandomNumberInRange = (minimum, maximum, roundingProximity = 0) => {
  const randomNumber = (Math.random() * (maximum - minimum)) + minimum;
  return parseFloat(randomNumber.toFixed(roundingProximity));
};
