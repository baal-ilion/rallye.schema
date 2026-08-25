package fr.vandriessche.rallyeschema.coreservice.services;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import com.mongodb.DBRef;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.bson.json.JsonMode;
import org.bson.json.JsonWriterSettings;
import org.bson.types.Binary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.MongoPersistentEntityIndexResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import fr.vandriessche.rallyeschema.coreservice.entities.LogFile;
import fr.vandriessche.rallyeschema.coreservice.entities.SubmittedForm;
import fr.vandriessche.rallyeschema.coreservice.entities.FormReferenceImage;
import com.mongodb.client.model.UpdateOptions;
import lombok.extern.java.Log;

@Service
@Log
public class DatabaseMaintenanceService {
    private static final String SYSTEM_COLLECTION_PREFIX = "system.";
    private static final String COLLECTION_FILE_EXTENSION = ".json";
    private static final String FILES_PREFIX = "files/";
    private static final UpdateOptions UPSERT_OPTIONS = new UpdateOptions().upsert(true);
    private static final JsonWriterSettings JSON_SETTINGS = JsonWriterSettings.builder()
            .outputMode(JsonMode.EXTENDED)
            .build();
    private static final int BATCH_SIZE = 500;

    @Autowired
    private MongoTemplate mongoTemplate;

    public void writeBackup(OutputStream outputStream) throws IOException {
        MongoDatabase database = mongoTemplate.getDb();
        Set<String> collectionsToDump = collectTargetCollections(database);
        Set<String> createdDirectories = new HashSet<>();
        try (ZipOutputStream zipOut = new ZipOutputStream(outputStream)) {
            for (String collectionName : collectionsToDump) {
                MongoCollection<Document> collection = database.getCollection(collectionName);
                log.info(() -> "Export collection " + collectionName);
                ZipEntry entry = new ZipEntry(collectionName + COLLECTION_FILE_EXTENSION);
                zipOut.putNextEntry(entry);
                writeCollection(collectionName, collection, zipOut);
                zipOut.closeEntry();

                exportBinaryIfPresent(collectionName, collection, zipOut, createdDirectories);
            }
        }
    }

    public void restoreFromBackup(MultipartFile file) throws IOException {
        validateBackup(file);
        MongoDatabase database = mongoTemplate.getDb();
        dropExistingCollections(database);

        try (ZipInputStream zis = new ZipInputStream(file.getInputStream(), StandardCharsets.UTF_8)) {
            ZipEntry entry = zis.getNextEntry();
            while (entry != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(COLLECTION_FILE_EXTENSION)) {
                    String collectionName = stripExtension(entry.getName());
                    log.info(() -> "Restore collection " + collectionName);
                    MongoCollection<Document> collection = database.getCollection(collectionName);
                    importCollection(collectionName, collection, zis);
                } else if (!entry.isDirectory() && entry.getName().startsWith(FILES_PREFIX)) {
                    processBinaryEntry(database, entry.getName(), zis);
                }
                zis.closeEntry();
                entry = zis.getNextEntry();
            }
        }
        ensureIndexes();
    }

    public void eraseDatabase() {
        MongoDatabase database = mongoTemplate.getDb();
        dropExistingCollections(database);
        ensureIndexes();
    }

    private void validateBackup(MultipartFile file) throws IOException {
        boolean collectionFound = false;
        try (ZipInputStream zis = new ZipInputStream(file.getInputStream(), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String name = entry.getName().replace('\\', '/');
                if (name.startsWith("/") || name.contains("../")) {
                    throw new IOException("Chemin interdit dans la sauvegarde : " + name);
                }
                if (entry.isDirectory()) {
                    zis.closeEntry();
                    continue;
                }
                if (name.endsWith(COLLECTION_FILE_EXTENSION) && !name.contains("/")) {
                    collectionFound = true;
                    validateCollectionEntry(name, zis);
                } else if (name.matches("^files/[^/]+/[^/]+$")) {
                    drainEntry(zis);
                } else {
                    throw new IOException("Entrée inconnue dans la sauvegarde : " + name);
                }
                zis.closeEntry();
            }
        } catch (RuntimeException exception) {
            throw new IOException("Sauvegarde ZIP invalide", exception);
        }
        if (!collectionFound) {
            throw new IOException("La sauvegarde ne contient aucune collection");
        }
    }

    private void validateCollectionEntry(String name, ZipInputStream zis) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(zis, StandardCharsets.UTF_8));
        String line;
        int lineNumber = 0;
        while ((line = reader.readLine()) != null) {
            lineNumber++;
            if (line.trim().isEmpty()) {
                continue;
            }
            try {
                Document.parse(line);
            } catch (RuntimeException exception) {
                throw new IOException("JSON invalide dans " + name + " à la ligne " + lineNumber, exception);
            }
        }
    }

    private void drainEntry(ZipInputStream zis) throws IOException {
        byte[] buffer = new byte[8192];
        while (zis.read(buffer) != -1) {
            // La lecture complète vérifie également l'intégrité de l'entrée ZIP.
        }
    }

    private void ensureIndexes() {
        MongoMappingContext mappingContext = (MongoMappingContext) mongoTemplate.getConverter().getMappingContext();
        MongoPersistentEntityIndexResolver resolver = new MongoPersistentEntityIndexResolver(mappingContext);
        mappingContext.getPersistentEntities().stream()
                .filter(entity -> entity.isAnnotationPresent(org.springframework.data.mongodb.core.mapping.Document.class))
                .forEach(entity -> resolver.resolveIndexFor(entity.getType())
                        .forEach(index -> mongoTemplate.indexOps(entity.getType()).ensureIndex(index)));
    }

    private void dropExistingCollections(MongoDatabase database) {
        List<String> collectionsToDrop = new ArrayList<>();
        for (String collectionName : database.listCollectionNames()) {
            if (shouldSkipCollection(collectionName)) {
                continue;
            }
            collectionsToDrop.add(collectionName);
        }
        for (String collectionName : collectionsToDrop) {
            log.info(() -> "Drop collection " + collectionName);
            database.getCollection(collectionName).drop();
        }
    }

    private Set<String> collectTargetCollections(MongoDatabase database) {
        Set<String> names = new HashSet<>();
        for (String name : database.listCollectionNames()) {
            if (!shouldSkipCollection(name)) {
                names.add(name);
            }
        }
        // Force business collections even if Mongo does not list them yet
        List<String> required = Arrays.asList(
                "submittedForm",
                "submittedFormMetadata",
                "formReferenceImage",
                "formRecognitionConfiguration",
                "formDesign",
                "rallyConfiguration",
                "challengeGroup",
                "challengeConfiguration",
                "challengeRanking",
                "challengeResponse",
                "challengeResult",
                "team",
                "teamPoint",
                "logFile"
        );
        names.addAll(required);
        log.info(() -> "Collections to dump: " + String.join(",", names));
        return names;
    }

    private void writeCollection(String collectionName, MongoCollection<Document> collection, ZipOutputStream zipOut)
            throws IOException {
        boolean first = true;
        boolean dropBinaryFileField = shouldDropBinaryField(collectionName);
        try (var cursor = collection.find().iterator()) {
            while (cursor.hasNext()) {
                Document document = cursor.next();
                Document sanitized = sanitizeDocument(document, dropBinaryFileField);
                if (!first) {
                    zipOut.write('\n');
                }
                first = false;
                zipOut.write(sanitized.toJson(JSON_SETTINGS).getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    private void importCollection(String collectionName, MongoCollection<Document> collection, ZipInputStream zis) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(zis, StandardCharsets.UTF_8));
        List<Document> batch = new ArrayList<>();
        String line;
        while ((line = reader.readLine()) != null) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            Document doc = Document.parse(trimmed);
            rehydrateReferences(collectionName, doc);
            batch.add(doc);
            if (batch.size() >= BATCH_SIZE) {
                collection.insertMany(new ArrayList<>(batch));
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            collection.insertMany(batch);
        }
    }

    private void exportBinaryIfPresent(String collectionName, MongoCollection<Document> collection,
            ZipOutputStream zipOut, Set<String> createdDirectories) throws IOException {
        if (!isBinaryCollection(collectionName)) {
            return;
        }

        String dir = FILES_PREFIX + collectionName + "/";
        boolean directoryCreated = false;

        int exported = 0;
        try (var cursor = collection.find().iterator()) {
            while (cursor.hasNext()) {
                Document document = cursor.next();
                byte[] data = extractBinaryData(document.get("file"));
                if (data == null || data.length == 0) {
                    continue;
                }
                if (!directoryCreated) {
                    if (createdDirectories.add(dir)) {
                        zipOut.putNextEntry(new ZipEntry(dir));
                        zipOut.closeEntry();
                    }
                    directoryCreated = true;
                }
                String id = String.valueOf(document.get("_id"));
                String ext = document.getString("fileExtension");
                writeBinaryEntry(zipOut, dir, id, ext, data);
                exported++;
            }
        }
        final int exportedFinal = exported;
        log.info(() -> "Exported " + exportedFinal + " binaries from " + dir);
    }

    private void processBinaryEntry(MongoDatabase database, String entryName, ZipInputStream zis) throws IOException {
        String normalized = entryName.replace('\\', '/');
        String[] parts = normalized.split("/");
        if (parts.length < 3) {
            return; // files/<collection>/<file>
        }
        String collectionName = parts[1];
        String fileName = parts[2];
        if (collectionName.isEmpty() || fileName.isEmpty()) {
            return;
        }
        int dot = fileName.lastIndexOf('.');
        String id = dot >= 0 ? fileName.substring(0, dot) : fileName;
        String ext = dot >= 0 && dot + 1 < fileName.length() ? fileName.substring(dot + 1) : "";

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] temp = new byte[8192];
        int read;
        while ((read = zis.read(temp)) != -1) {
            buffer.write(temp, 0, read);
        }
        byte[] data = buffer.toByteArray();
        if (data.length == 0) {
            return;
        }
        MongoCollection<Document> collection = database.getCollection(collectionName);
        Object idValue = toIdValue(id);
        Document filter = new Document("_id", idValue);
        Document updateData = new Document("file", new Binary(data));
        if (ext != null && !ext.isEmpty()) {
            updateData.put("fileExtension", ext);
        }
        collection.updateOne(filter, new Document("$set", updateData), UPSERT_OPTIONS);
    }

    private void rehydrateReferences(String collectionName, Document doc) {
        String submittedFormCollection = mongoTemplate.getCollectionName(SubmittedForm.class);
        String formReferenceImageCollection = mongoTemplate.getCollectionName(FormReferenceImage.class);
        String challengeConfigurationCollection = mongoTemplate.getCollectionName(fr.vandriessche.rallyeschema.coreservice.entities.ChallengeConfiguration.class);
        String formRecognitionConfigurationCollection = mongoTemplate.getCollectionName(fr.vandriessche.rallyeschema.coreservice.entities.FormRecognitionConfiguration.class);
        String submittedFormMetadataCollection = mongoTemplate.getCollectionName(fr.vandriessche.rallyeschema.coreservice.entities.SubmittedFormMetadata.class);
        String challengeGroupCollection = mongoTemplate.getCollectionName(fr.vandriessche.rallyeschema.coreservice.entities.ChallengeGroup.class);

        if (collectionName.equals(submittedFormCollection)) {
            DBRef metadataRef = toDbRef(submittedFormMetadataCollection, doc.get("metadata"));
            if (metadataRef != null) {
                doc.put("metadata", metadataRef);
            }
        }
        if (collectionName.equals(formReferenceImageCollection)) {
            DBRef configurationRef = toDbRef(formRecognitionConfigurationCollection, doc.get("configuration"));
            if (configurationRef != null) {
                doc.put("configuration", configurationRef);
            }
        }
        if (collectionName.equals(challengeConfigurationCollection)) {
            DBRef groupRef = toDbRef(challengeGroupCollection, doc.get("group"));
            if (groupRef != null) {
                doc.put("group", groupRef);
            }
            Object listObj = doc.get("formRecognitionConfigurations");
            if (listObj instanceof List) {
                List<?> original = (List<?>) listObj;
                List<DBRef> refs = new ArrayList<>();
                for (Object item : original) {
                    DBRef ref = toDbRef(formRecognitionConfigurationCollection, item);
                    if (ref != null) {
                        refs.add(ref);
                    }
                }
                doc.put("formRecognitionConfigurations", refs);
            }
        }
    }

    private DBRef toDbRef(String collectionName, Object value) {
        Object id = unwrapId(value);
        if (id == null) {
            return null;
        }
        return new DBRef(collectionName, id);
    }

    private Object unwrapId(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Document) {
            Document doc = (Document) value;
            if (doc.containsKey("$oid")) {
                return doc.getString("$oid");
            }
            if (doc.containsKey("_id")) {
                return doc.get("_id");
            }
        }
        return value;
    }

    private Object toIdValue(String id) {
        try {
            return new org.bson.types.ObjectId(id);
        } catch (IllegalArgumentException ex) {
            return id;
        }
    }

    private void writeBinaryEntry(ZipOutputStream zipOut, String dir, String id, String ext, byte[] data)
            throws IOException {
        String fileName = dir + id + (ext != null && !ext.isEmpty() ? "." + ext : "");
        ZipEntry fileEntry = new ZipEntry(fileName);
        zipOut.putNextEntry(fileEntry);
        zipOut.write(data);
        zipOut.closeEntry();
    }

    private byte[] extractBinaryData(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Binary) {
            return ((Binary) value).getData();
        }
        if (value instanceof byte[]) {
            return (byte[]) value;
        }
        if (value instanceof Document) {
            Object data = ((Document) value).get("data");
            if (data instanceof Binary) {
                return ((Binary) data).getData();
            }
            if (data instanceof byte[]) {
                return (byte[]) data;
            }
            Document binaryDoc = ((Document) value).get("$binary", Document.class);
            if (binaryDoc != null) {
                Object base64 = binaryDoc.get("base64");
                if (base64 instanceof String) {
                    return java.util.Base64.getDecoder().decode((String) base64);
                }
            }
        }
        return null;
    }

    private Document sanitizeDocument(Document document, boolean dropBinaryFileField) {
        Document sanitized = new Document();
        for (var entry : document.entrySet()) {
            if (dropBinaryFileField && "file".equals(entry.getKey())) {
                continue;
            }
            sanitized.put(entry.getKey(), sanitizeValue(entry.getValue(), dropBinaryFileField));
        }
        return sanitized;
    }

    @SuppressWarnings("unchecked")
    private Object sanitizeValue(Object value, boolean dropBinaryFileField) {
        if (value instanceof DBRef) {
            return ((DBRef) value).getId();
        }
        if (value instanceof Document) {
            return sanitizeDocument((Document) value, dropBinaryFileField);
        }
        if (value instanceof List) {
            List<Object> sanitizedList = new ArrayList<>();
            for (Object item : (List<Object>) value) {
                sanitizedList.add(sanitizeValue(item, dropBinaryFileField));
            }
            return sanitizedList;
        }
        return value;
    }

    private boolean isBinaryCollection(String collectionName) {
        String submittedFormCollection = mongoTemplate.getCollectionName(SubmittedForm.class);
        String formReferenceImageCollection = mongoTemplate.getCollectionName(FormReferenceImage.class);
        String logFileCollection = mongoTemplate.getCollectionName(LogFile.class);
        return collectionName.equals(submittedFormCollection)
                || collectionName.equals(formReferenceImageCollection)
                || collectionName.equals(logFileCollection);
    }

    private boolean shouldDropBinaryField(String collectionName) {
        return isBinaryCollection(collectionName);
    }

    private boolean shouldSkipCollection(String collectionName) {
        return collectionName.startsWith(SYSTEM_COLLECTION_PREFIX);
    }

    private String stripExtension(String name) {
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        String fileName = slash >= 0 ? name.substring(slash + 1) : name;
        if (fileName.endsWith(COLLECTION_FILE_EXTENSION)) {
            return fileName.substring(0, fileName.length() - COLLECTION_FILE_EXTENSION.length());
        }
        return fileName;
    }

}
