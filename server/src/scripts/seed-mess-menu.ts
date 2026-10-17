import {
  deleteApp,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  type Firestore,
} from 'firebase-admin/firestore';

import { adminApp, adminDb } from '@server/config/firebase';

interface DefaultMenuItem {
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  mealPeriod: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  description: string;
}

const TARGET_PROJECT = 'uet-hostel-management-48e69';
const SEED_ID_PREFIX = 'default-mess-menu';

const DEFAULT_MENU: DefaultMenuItem[] = [
  { day: 'monday', mealPeriod: 'breakfast', name: 'Paratha, Omelette & Chai', description: 'Fresh paratha served with omelette and tea.' },
  { day: 'monday', mealPeriod: 'lunch', name: 'Chicken Biryani', description: 'Chicken biryani served with raita and salad.' },
  { day: 'monday', mealPeriod: 'dinner', name: 'Daal Chawal', description: 'Seasonal lentils with rice, salad and pickle.' },
  { day: 'tuesday', mealPeriod: 'breakfast', name: 'Chana Puri', description: 'Chickpea curry served with puri and tea.' },
  { day: 'tuesday', mealPeriod: 'lunch', name: 'Chicken Karahi', description: 'Chicken karahi served with roti and salad.' },
  { day: 'tuesday', mealPeriod: 'dinner', name: 'Aloo Keema', description: 'Potato and minced meat curry served with roti.' },
  { day: 'wednesday', mealPeriod: 'breakfast', name: 'Aloo Paratha & Yogurt', description: 'Stuffed potato paratha served with yogurt and tea.' },
  { day: 'wednesday', mealPeriod: 'lunch', name: 'Daal Mash & Roti', description: 'Daal mash served with roti, salad and raita.' },
  { day: 'wednesday', mealPeriod: 'dinner', name: 'Chicken Pulao', description: 'Chicken pulao served with raita and salad.' },
  { day: 'thursday', mealPeriod: 'breakfast', name: 'Boiled Eggs, Bread & Chai', description: 'Boiled eggs and bread served with tea.' },
  { day: 'thursday', mealPeriod: 'lunch', name: 'Beef Nihari', description: 'Nihari served with naan, lemon and ginger.' },
  { day: 'thursday', mealPeriod: 'dinner', name: 'Mix Sabzi & Roti', description: 'Seasonal mixed vegetables served with roti and yogurt.' },
  { day: 'friday', mealPeriod: 'breakfast', name: 'Halwa Puri', description: 'Halwa and chana served with puri and tea.' },
  { day: 'friday', mealPeriod: 'lunch', name: 'Chicken Qorma & Naan', description: 'Chicken qorma served with naan and salad.' },
  { day: 'friday', mealPeriod: 'dinner', name: 'Vegetable Fried Rice', description: 'Vegetable fried rice served with chicken manchurian.' },
  { day: 'saturday', mealPeriod: 'breakfast', name: 'French Toast & Chai', description: 'French toast served with tea.' },
  { day: 'saturday', mealPeriod: 'lunch', name: 'Chicken Pulao', description: 'Chicken pulao served with raita and salad.' },
  { day: 'saturday', mealPeriod: 'dinner', name: 'Chana Masala & Roti', description: 'Chickpea curry served with roti and salad.' },
  { day: 'sunday', mealPeriod: 'breakfast', name: 'Paratha, Chana & Chai', description: 'Paratha and chickpea curry served with tea.' },
  { day: 'sunday', mealPeriod: 'lunch', name: 'Beef Biryani', description: 'Beef biryani served with raita and salad.' },
  { day: 'sunday', mealPeriod: 'dinner', name: 'Chicken Roast & Roti', description: 'Roast chicken served with roti and seasonal vegetables.' },
];

function getProjectArgument(args: string[]): string {
  const projectFlagIndex = args.findIndex(
    (argument) => argument === '--project'
  );
  const inlineProjectArgument = args.find((argument) =>
    argument.startsWith('--project=')
  );
  const project =
    inlineProjectArgument?.slice('--project='.length) ??
    (projectFlagIndex >= 0 ? args[projectFlagIndex + 1] : undefined);

  if (args.includes('--help')) {
    console.info(
      `Usage: npm run seed:mess -- --project ${TARGET_PROJECT}`
    );
    process.exit(0);
  }

  if (!project) {
    throw new Error('A target project is required. No data was written.');
  }

  const isExplicitEmulatorTarget =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
    project.startsWith('demo-');

  if (project !== TARGET_PROJECT && !isExplicitEmulatorTarget) {
    throw new Error(
      `Pass --project ${TARGET_PROJECT} to confirm the live target, or use a demo-* project with FIRESTORE_EMULATOR_HOST set. No data was written.`
    );
  }

  return project;
}

async function getDatabase(projectId: string): Promise<{
  database: Firestore;
  emulatorApp?: App;
}> {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const emulatorAppName = `mess-menu-seeder-${process.pid}`;
    const emulatorApp = initializeApp({ projectId }, emulatorAppName);
    return {
      database: getFirestore(emulatorApp),
      emulatorApp,
    };
  }

  if (!adminDb || !adminApp) {
    throw new Error(
      'Firebase Admin is not configured. Set server credentials in the root .env; no data was written.'
    );
  }

  const credentialProjectId = adminApp.options.projectId;

  if (credentialProjectId !== projectId) {
    throw new Error(
      `Firebase Admin credentials target ${credentialProjectId ?? 'an unknown project'}, not ${projectId}. No data was written.`
    );
  }

  return { database: adminDb };
}

function normalizeName(name: unknown): string {
  return typeof name === 'string'
    ? name.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
    : '';
}

async function addDefaultMenuItems(
  database: Firestore,
  createdBy: string
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  for (const item of DEFAULT_MENU) {
    const documentId = `${SEED_ID_PREFIX}-${item.day}-${item.mealPeriod}`;
    const itemRef = database.collection('menuItems').doc(documentId);
    const result = await database.runTransaction(async (transaction) => {
      const existingSeed = await transaction.get(itemRef);
      if (existingSeed.exists) {
        return 'skipped' as const;
      }

      const sameDayItems = await transaction.get(
        database.collection('menuItems').where('day', '==', item.day)
      );
      const existingEquivalent = sameDayItems.docs.some(
        (document) =>
          document.get('mealPeriod') === item.mealPeriod &&
          normalizeName(document.get('name')) === normalizeName(item.name)
      );

      if (existingEquivalent) {
        return 'skipped' as const;
      }

      const now = FieldValue.serverTimestamp();
      transaction.create(itemRef, {
        ...item,
        imageUrl: '',
        isAvailable: true,
        createdBy,
        createdAt: now,
        updatedAt: now,
      });

      return 'added' as const;
    });

    if (result === 'added') {
      added += 1;
    } else {
      skipped += 1;
    }
  }

  return { added, skipped };
}

async function main(): Promise<void> {
  const projectId = getProjectArgument(process.argv.slice(2));
  const { database, emulatorApp } = await getDatabase(projectId);

  try {
    const admins = await database
      .collection('users')
      .where('role', '==', 'admin')
      .limit(1)
      .get();

    if (admins.empty) {
      throw new Error(
        'No administrator profile was found in users. Create an admin profile before seeding; no menu items were added.'
      );
    }

    const result = await addDefaultMenuItems(database, admins.docs[0].id);
    console.info(
      `Mess menu seed finished for ${projectId}: ${result.added} added, ${result.skipped} already present. No existing records were changed or deleted.`
    );
  } finally {
    if (emulatorApp) {
      await deleteApp(emulatorApp);
    }
  }
}

main().catch((error: unknown) => {
  console.error(
    '[seed:mess] Failed:',
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
