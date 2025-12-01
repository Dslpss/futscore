import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function schedulePushNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: null,
  });
}

export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }
}

export async function scheduleMatchStartNotification(match: any) {
  const matchDate = new Date(match.fixture.date);
  const now = new Date();
  
  // Schedule for 15 minutes before match
  const triggerDate = new Date(matchDate.getTime() - 15 * 60 * 1000);

  // If match is already started or less than 15 mins away, don't schedule
  if (triggerDate <= now) {
    return;
  }

  const identifier = `match_start_${match.fixture.id}`;

  // Check if already scheduled to avoid duplicates
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const isScheduled = scheduled.some(n => n.identifier === identifier);

  if (isScheduled) {
    return;
  }

  const title = `Vai começar: ${match.teams.home.name} vs ${match.teams.away.name}`;
  const body = `A partida começa em 15 minutos! ⚽`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { matchId: match.fixture.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
    identifier,
  });
  
  console.log(`[Notifications] Scheduled for ${match.teams.home.name} vs ${match.teams.away.name} at ${triggerDate.toLocaleTimeString()}`);
}

export async function cancelMatchNotification(matchId: number) {
  const identifier = `match_start_${matchId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
