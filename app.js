require("dotenv").config();
const amqp = require("amqplib");
const { retry } = require("./utils/retry");

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}/${process.env.RABBITMQ_VHOST}`;
const RABBITMQ_QUEUE = process.env.RABBITMQ_QUEUE;
console.log(RABBITMQ_URL, RABBITMQ_QUEUE);

const StartConnectMessaging = async (host, Channel) => {
  console.log("Start Connect Messaging");
  const MakeConnection = async () => {
    console.log("Waiting for Rabbit.");

    const messaging = await retry(
      () => amqp.connect(host, { reconnect: true }),
      1000,
      5000
    );
    messaging.isOpen = true;
    console.log("Connected to Rabbit.");
    messaging.on("close", () => {
      console.log("Rabbit connection closed! Will attempt reconnection.");
      messaging.isOpen = false;
      MakeConnection()
        .then(() => console.log("Reconnected to rabbit."))
        .catch((err) => {
          console.error("Failed to reconnect to Rabbit.");
          console.log(err?.message);
        });
    });
    messaging.on("error", (err) => {
      console.log("Error from Rabbit:");
      console.log(err?.message);
    });
    const promise = Channel(messaging);
    if (promise) {
      promise
        .then(() => console.log("Connection callback completed."))
        .catch((err) => {
          console.error("Error running client connection callback.");
          console.log(err?.message);
        });
    } else {
      console.log("Connection callback completed.");
    }
  };

  await MakeConnection();
};

const ConsumeMessages = async (channel, queue_name, handler) => {
  await channel.consume(
    queue_name,
    (data) => {
      try {
        const payload = JSON.parse(data?.content?.toString());

        const promise = handler(payload);
        if (promise) {
          promise
            .then((res) => {
              if (res?.action === "nack") {
                channel.nack(data, false, false);
              } else {
                channel.ack(data);
              }
            })
            .catch((err) => {
              console.error(queue_name + " async handler errored.");
              console.error((err && err.stack) || err);
            });
        } else {
          channel.ack(data);
        }
      } catch (err) {
        channel.nack(data, false, false);
        console.error(queue_name + " handler errored.");
        console.error((err && err.stack) || err);
      }
    },
    {
      noAck: false,
    }
  );
};

const HandleMessage = async (message) => {
  console.log(message);
  return { status: false, action: "nack" };
};

(async () => {
  try {
    StartConnectMessaging(RABBITMQ_URL, async (messaging) => {
      const channel = await messaging.createChannel();
      await channel.assertQueue(RABBITMQ_QUEUE, { durable: true });
      await ConsumeMessages(channel, RABBITMQ_QUEUE, async (payload) => {
        if (payload == undefined || payload == null || !payload) return false;
        const response = await HandleMessage(payload);
        return response;
      });
    });
  } catch (error) {
    console.error(error?.message);
  }
})();
