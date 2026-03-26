/**
 * Represents result of importing a CSV file. Detailed error is provided on if the CSV file
 * is conformant and failure to load any of the records in the CSV file.
 */
export interface CSVImportResult {
    /**
     * Reason why import was aborted. This is set only when the `status` field is set to
     * `aborted`
     */
    abortReason?: string;
    /**
     * True if the CSV import has dryRun flag enabled
     */
    dryRun?: boolean;
    /**
     * CSV file that captures the result of import operation.
     */
    importResultsCsv?: string;
    /**
     * Human-readable summary message showing success, failure counts and failure reasons.
     */
    message?:               string;
    numberOfRowsFailed?:    number;
    numberOfRowsPassed?:    number;
    numberOfRowsProcessed?: number;
    status?:                Status;
}

/**
 * State of an action over API.
 */
export enum Status {
    Aborted = "aborted",
    Failure = "failure",
    PartialSuccess = "partialSuccess",
    Success = "success",
}
