import { db } from '../firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Utility to backup and reset the database for the user.
 * ONLY for administrative use.
 */

export const backupCollections = async (collections: string[]) => {
    const backupData: Record<string, any[]> = {};
    
    for (const colName of collections) {
        const querySnapshot = await getDocs(collection(db, colName));
        backupData[colName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    // Create a Blob and download it as JSON
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `agrovista_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return backupData;
};

export const resetTestData = async () => {
    // List of collections that contain test data and SHOULD be cleared
    const collectionsToClear = [
        'trials',
        'applications',
        'transactions',
        'audit',
        'notifications',
        'pendingTasks',
        'chat_messages',
        'chat_groups'
    ];
    
    console.log("Starting full database reset...");
    
    for (const colName of collectionsToClear) {
        const querySnapshot = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Cleared collection: ${colName}`);
    }
    
    console.log("Reset complete. User accounts and settings were preserved.");
};
