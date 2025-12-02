import db from "../../../../config/firebaseConfig";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { RepositoryError } from "../errors/errors";
import {
    getErrorMessage,
    getErrorCode,
    getFirebaseErrorStatusCode,
} from "../utils/errorUtils";

/**
 * Defines the allowed data types that can be stored in Firestore.
 * These types are restricted to ensure type safety when working with Firestore documents.
 */
type FirestoreDataTypes =
    | string
    | number
    | boolean
    | null
    | Timestamp
    | FieldValue;

/**
 * Represents a field-value pair used for querying documents.
 * Used primarily in filtering operations when deleting multiple documents.
 */
interface FieldValuePair {
    fieldName: string;
    fieldValue: FirestoreDataTypes;
}

/**
 * Executes a Firestore transaction with provided operations.
 * Transactions in Firestore allow you to perform multiple operations atomically.
 *
 * @template T - The expected return type of the transaction
 * @param operations - A function that receives a transaction object and returns a Promise
 * @returns Promise resolving to the transaction result
 * @throws Error if the transaction fails
 *
 * @example
 * const result = await runTransaction(async (transaction) => {
 *   const docRef = db.collection('users').doc('userId');
 *   const doc = await transaction.get(docRef);
 *   // Perform operations with transaction
 *   return someValue;
 * });
 */
export const runTransaction = async <T>(
    operations: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> => {
    try {
        return await db.runTransaction(operations);
    } catch (error: unknown) {
        throw new RepositoryError(
            `Transaction failed: ${getErrorMessage(error)}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};

/**
 * Creates a new document in the specified collection.
 *
 * @template T - The type of data being stored
 * @param collectionName - The name of the collection to create the document in
 * @param data - The data to be stored in the document
 * @param id - Optional custom document ID. If not provided, Firestore will auto-generate one
 * @returns Promise resolving to the created document's ID
 * @throws Error if document creation fails
 *
 * @example
 * const docId = await createDocument('users', { name: 'John', age: 25 });
 */
export const createDocument = async <T>(
    collectionName: string,
    data: Partial<T>,
    id?: string
): Promise<string> => {
    try {
        let docRef: FirebaseFirestore.DocumentReference;

        // If an ID is provided, use it to create a document at that specific ID
        // Otherwise, let Firestore auto-generate an ID
        if (id) {
            docRef = db.collection(collectionName).doc(id);
            await docRef.set(data);
        } else {
            docRef = await db.collection(collectionName).add(data);
        }

        return docRef.id;
    } catch (error: unknown) {
        throw new RepositoryError(
            `Failed to create document in ${collectionName}: ${getErrorMessage(
                error
            )}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};

/**
 * Retrieves all documents from a specified collection.
 * Note: Be cautious with this function on large collections as it fetches all documents.
 *
 * @param collectionName - The name of the collection to retrieve documents from
 * @returns Promise resolving to a QuerySnapshot containing all documents
 * @throws Error if fetching documents fails
 */
export const getDocuments = async (
    collectionName: string
): Promise<FirebaseFirestore.QuerySnapshot> => {
    try {
        return await db.collection(collectionName).get();
    } catch (error: unknown) {
        throw new RepositoryError(
            `Failed to fetch documents from ${collectionName}: ${getErrorMessage(
                error
            )}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};

/**
 * Retrieves a specific document by its ID from a collection.
 *
 * @param collectionName - The name of the collection containing the document
 * @param id - The ID of the document to retrieve
 * @returns Promise resolving to a DocumentSnapshot
 * @throws Error if fetching the document fails
 *
 * @example
 * const doc = await getDocumentsById('users', 'userId');
 * if (doc.exists) {
 *   const userData = doc.data();
 * }
 */
export const getDocumentById = async (
    collectionName: string,
    id: string
): Promise<FirebaseFirestore.DocumentSnapshot> => {
    try {
        const doc: FirebaseFirestore.DocumentSnapshot = await db
            .collection(collectionName)
            .doc(id)
            .get();

        if (!doc.exists) {
            throw new RepositoryError(
                `Document not found in collection ${collectionName} with id ${id}`,
                "DOCUMENT_NOT_FOUND",
                404
            );
        }

        return doc;
    } catch (error: unknown) {
        if (error instanceof RepositoryError) {
            throw error;
        }

        throw new RepositoryError(
            `Failed to fetch document ${id} from ${collectionName}: ${getErrorMessage(
                error
            )}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};

/**
 * Retrieves all documents that match a specific field-value pair from a collection.
 *
 * @param collectionName - The name of the collection to search in
 * @param fieldName - The name of the field to filter by
 * @param fieldValue - The value to match against the field
 * @param limit - Optional maximum number of documents to return
 * @returns Promise resolving to a QuerySnapshot containing all matching documents
 * @throws Error if the query fails
 *
 * @example
 * const snapshot = await getDocumentsByFieldValue('users', 'status', 'active');
 * if (!snapshot.empty) {
 *   snapshot.forEach(doc => {
 *     const userData = doc.data();
 *     console.log(`User ${doc.id}: ${userData.name}`);
 *   });
 * }
 */
export const getDocumentsByFieldValue = async (
    collectionName: string,
    fieldName: string,
    fieldValue: FirestoreDataTypes,
    limit?: number
): Promise<FirebaseFirestore.QuerySnapshot> => {
    try {
        let query: FirebaseFirestore.Query = db
            .collection(collectionName)
            .where(fieldName, "==", fieldValue);

        // Apply limit if specified
        if (limit && limit > 0) {
            query = query.limit(limit);
        }

        const snapshot: FirebaseFirestore.QuerySnapshot = await query.get();

        if (snapshot.empty) {
            throw new RepositoryError(
                `No documents found in collection ${collectionName} where ${fieldName} == ${String(
                    fieldValue
                )}`,
                "DOCUMENTS_NOT_FOUND",
                404
            );
        }

        return snapshot;
    } catch (error: unknown) {
        if (error instanceof RepositoryError) {
            throw error;
        }

        throw new RepositoryError(
            `Failed to fetch documents from ${collectionName} where ${fieldName} == ${String(
                fieldValue
            )}: ${getErrorMessage(error)}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};

/**
 * Updates a specific document in a collection with new data.
 * Only the fields specified in the data parameter will be updated.
 *
 * @template T - The type of the document data
 * @param collectionName - The name of the collection containing the document
 * @param id - The ID of the document to update
 * @param data - Partial data to update in the document
 * @throws Error if updating the document fails
 *
 * @example
 * await updateDocument('users', 'userId', { age: 26, lastUpdated: new Date() });
 */
export const updateDocument = async <T>(
    collectionName: string,
    id: string,
    data: Partial<T>
): Promise<void> => {
    try {
        await db.collection(collectionName).doc(id).update(data);
    } catch (error: unknown) {
        throw new RepositoryError(
            `Failed to update document ${id} in ${collectionName}: ${getErrorMessage(
                error
            )}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};

/**
 * Deletes a specific document from a collection.
 * Can be used both with and without a transaction.
 *
 * @param collectionName - The name of the collection containing the document
 * @param id - The ID of the document to delete
 * @param transaction - Optional transaction object for atomic operations
 * @throws Error if deleting the document fails
 *
 * @example
 * // Simple delete
 * await deleteDocument('users', 'userId');
 *
 * // Delete within a transaction
 * await runTransaction(async (transaction) => {
 *   await deleteDocument('users', 'userId', transaction);
 * });
 */
export const deleteDocument = async (
    collectionName: string,
    id: string,
    transaction?: FirebaseFirestore.Transaction
): Promise<void> => {
    try {
        const docRef: FirebaseFirestore.DocumentReference = db
            .collection(collectionName)
            .doc(id);

        // If transaction is provided, use it for atomic operations
        // Otherwise, perform a regular delete
        if (transaction) {
            transaction.delete(docRef);
        } else {
            await docRef.delete();
        }
    } catch (error: unknown) {
        throw new RepositoryError(
            `Failed to delete document ${id} from ${collectionName}: ${getErrorMessage(
                error
            )}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};

/**
 * Deletes multiple documents that match specific field-value pairs.
 * Uses batched writes when not in a transaction for better performance.
 *
 * @param collectionName - The name of the collection to delete documents from
 * @param fieldValuePairs - Array of field-value pairs to match documents against
 * @param transaction - Optional transaction object for atomic operations
 * @throws Error if deleting the documents fails
 *
 * @example
 * // Delete all documents where status is 'inactive' and type is 'temporary'
 * await deleteDocumentsByFieldValues('users', [
 *   { fieldName: 'status', fieldValue: 'inactive' },
 *   { fieldName: 'type', fieldValue: 'temporary' }
 * ]);
 */
export const deleteDocumentsByFieldValues = async (
    collectionName: string,
    fieldValuePairs: FieldValuePair[],
    transaction?: FirebaseFirestore.Transaction
): Promise<void> => {
    try {
        // Start with a base query on the collection
        let query: FirebaseFirestore.Query = db.collection(collectionName);

        // Build the query by adding all field-value filters
        fieldValuePairs.forEach(({ fieldName, fieldValue }) => {
            query = query.where(fieldName, "==", fieldValue);
        });

        let snapshot: FirebaseFirestore.QuerySnapshot;

        if (transaction) {
            // If within a transaction, get documents and delete them one by one
            snapshot = await transaction.get(query);
            snapshot.docs.forEach((doc) => {
                transaction.delete(doc.ref);
            });
        } else {
            // If not in a transaction, use a batch for better performance
            snapshot = await query.get();
            const batch: FirebaseFirestore.WriteBatch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    } catch (error: unknown) {
        const fieldValueString: string = fieldValuePairs
            .map(({ fieldName, fieldValue }) => `${fieldName} == ${fieldValue}`)
            .join(" AND ");
        throw new RepositoryError(
            `Failed to delete documents from ${collectionName} where ${fieldValueString}: ${getErrorMessage(
                error
            )}`,
            getErrorCode(error),
            getFirebaseErrorStatusCode(error)
        );
    }
};
