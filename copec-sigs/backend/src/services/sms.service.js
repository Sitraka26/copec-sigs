/**
 * Service d'envoi de SMS via "SMS Gateway for Android" en mode Local Server.
 * https://docs.sms-gate.app/ — application gratuite et open-source.
 *
 * Principe : un smartphone Android avec une carte SIM fait tourner l'appli
 * en mode "Local Server". Notre backend lui envoie une requête HTTP sur le
 * réseau local (WiFi de l'école, sans internet), et le téléphone envoie le
 * SMS via le réseau cellulaire classique.
 *
 * Configuration requise dans .env :
 *   SMS_GATEWAY_URL=http://<ip-locale-du-telephone>:8080
 *   SMS_GATEWAY_USER=...
 *   SMS_GATEWAY_PASSWORD=...
 *
 * Si ces variables ne sont pas configurées, l'envoi est simplement ignoré
 * (utile pendant le développement, avant d'avoir le téléphone dédié).
 */

async function envoyerSms(numero, message) {
  if (!numero) {
    return { envoye: false, raison: 'Aucun numéro de contact enregistré pour cet élève' };
  }

  if (!process.env.SMS_GATEWAY_URL) {
    return { envoye: false, raison: 'Passerelle SMS non configurée (SMS_GATEWAY_URL manquant dans .env)' };
  }

  try {
    const identifiants = Buffer.from(
      `${process.env.SMS_GATEWAY_USER}:${process.env.SMS_GATEWAY_PASSWORD}`
    ).toString('base64');

    const reponse = await fetch(`${process.env.SMS_GATEWAY_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${identifiants}`,
      },
      body: JSON.stringify({
        textMessage: { text: message },
        phoneNumbers: [numero],
      }),
    });

    if (!reponse.ok) {
      throw new Error(`La passerelle SMS a répondu avec le statut ${reponse.status}`);
    }

    return { envoye: true };
  } catch (err) {
    return { envoye: false, raison: err.message };
  }
}

module.exports = { envoyerSms };