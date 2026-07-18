import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, ModulePermission } from '../types/user';
import { 
    signOut, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db } from '../firebase';
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    onSnapshot, 
    updateDoc, 
    deleteDoc
} from 'firebase/firestore';

interface UserContextProps {
    users: User[];
    currentUser: User;
    setCurrentUser: (u: User) => void;
    addUser: (u: Partial<User>) => Promise<void>;
    updateUser: (id: string, u: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    hasPermission: (module: ModulePermission) => boolean;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    isLoadingAuth: boolean;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    // Sync users from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("Auth State Changed:", firebaseUser?.email);
            try {
                if (firebaseUser) {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    
                    try {
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists()) {
                            const data = userDoc.data() as User;
                            
                            // Bloquear usuario inactivo
                            if (data.isActive === false) {
                                console.warn("Access denied. User is inactive.");
                                await signOut(auth);
                                throw new Error("Acceso denegado: Usuario no habilitado");
                            }

                            // Construir el usuario exacto como está en Firestore
                            const userData: User = {
                                ...data,
                                id: firebaseUser.uid,
                                avatar: firebaseUser.photoURL || data.avatar
                            };
                            
                            setCurrentUser(userData);
                        } else {
                            // Usuario NO existe en Firestore
                            console.warn("Access denied. User document not found in 'users' collection.");
                            await signOut(auth);
                            throw new Error("Acceso denegado: Usuario no registrado en el sistema. Contacte al administrador.");
                        }
                    } catch (firestoreError) {
                        console.error("Firestore access error:", firestoreError);
                        throw firestoreError;
                    }
                } else {
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error("Auth initialization error:", error);
                setCurrentUser(null);
            } finally {
                setIsLoadingAuth(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const addUser = async (userData: Partial<User>) => {
        if (!userData.email) throw new Error("Email requerido");
        
        const tempPassword = "Agrovista2026*"; 
        let secondaryApp;

        try {
            secondaryApp = initializeApp(auth.app.options, "SecondaryAdminApp_" + Date.now());
            const secondaryAuth = getAuth(secondaryApp);
            
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, tempPassword);
            const newUid = userCredential.user.uid;
            
            await secondaryAuth.signOut();
            await deleteApp(secondaryApp);
            
            const newUser: User = {
                id: newUid,
                name: userData.name || '',
                email: userData.email || '',
                role: userData.role || 'user',
                modules: userData.modules || [],
                isActive: userData.isActive !== false,
                avatar: ''
            };
            
            await setDoc(doc(db, 'users', newUid), newUser);
            console.log("Usuario creado:", newUid);
        } catch (error) {
            if (secondaryApp) await deleteApp(secondaryApp).catch(() => {});
            throw error;
        }
    };

    const updateUser = async (id: string, userData: Partial<User>) => {
        const userDocRef = doc(db, 'users', id);
        await updateDoc(userDocRef, userData);
    };

    const deleteUser = async (id: string) => {
        // Nota: Esto solo borra de Firestore. El usuario sigue en Firebase Auth.
        // Para borrarlo de Auth se requiere Admin SDK (Backend) o que el usuario se borre a sí mismo.
        await deleteDoc(doc(db, 'users', id));
    };

    const hasPermission = (module: ModulePermission) => {
        if (!currentUser || !currentUser.isActive) return false;
        if (currentUser.role === 'admin') return true;
        
        const perms = currentUser.modules || [];
        return perms.includes(module);
    };

    const signInWithEmail = async (email: string, pass: string) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, pass);
            // Inmediatamente validar si existe en Firestore ANTES de dar success
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (!userDoc.exists() || userDoc.data()?.isActive === false) {
                await signOut(auth);
                const msg = !userDoc.exists() ? "Usuario no registrado en la base de datos." : "Usuario no habilitado.";
                throw new Error(msg);
            }
        } catch (error) {
            console.error("Error signing in with email", error);
            throw error;
        }
    };

    const sendPasswordReset = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Error sending password reset email", error);
            throw error;
        }
    };
    const logout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('isAuthenticated');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <UserContext.Provider value={{
            users,
            currentUser: currentUser || { id: 'guest', name: 'Invitado', email: '', role: 'user', modules: [], isActive: false },
            setCurrentUser: () => {}, // Disabled manual set
            addUser,
            updateUser,
            deleteUser,
            hasPermission,
            signInWithEmail,
            logout,
            sendPasswordReset,
            isLoadingAuth
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within a UserProvider');
    }
    return context;
}
