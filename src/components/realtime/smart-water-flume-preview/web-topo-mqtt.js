import mqtt from 'mqtt';
import { parseMqttPayload } from './web-topo-html-runtime.js';

export function connectWebTopoMqtt(config, onData, onError) {
  const url = config?.url?.trim();
  const topic = config?.topic?.trim();
  if (!url || !topic) return null;

  const options = {
    clean: true,
    connectTimeout: 4000,
  };
  if (config.username) options.username = config.username;
  if (config.password) options.password = config.password;
  if (config.clientId?.trim()) options.clientId = config.clientId.trim();

  const client = mqtt.connect(url, options);
  client.on('connect', () => {
    client.subscribe(topic, { qos: 0 }, (error) => {
      if (error) onError?.(error);
    });
  });
  client.on('message', (receivedTopic, message) => {
    const payload = parseMqttPayload(message);
    onData?.(payload, receivedTopic, message?.toString?.() || '');
  });
  client.on('error', (error) => onError?.(error));
  return client;
}

export function subscribeWebTopoMqtt(client, topic, onError) {
  const normalizedTopic = topic?.trim();
  if (!client || !normalizedTopic) return;
  client.subscribe(normalizedTopic, { qos: 0 }, (error) => {
    if (error) onError?.(error);
  });
}

export function unsubscribeWebTopoMqtt(client, topic, onError) {
  const normalizedTopic = topic?.trim();
  if (!client || !normalizedTopic) return;
  client.unsubscribe(normalizedTopic, (error) => {
    if (error) onError?.(error);
  });
}

export function disconnectWebTopoMqtt(client) {
  if (!client) return;
  client.removeAllListeners();
  client.end(true);
}
