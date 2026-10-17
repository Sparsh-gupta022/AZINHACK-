import mongoose, { Schema } from 'mongoose';

const documentItemSchema = new Schema(
    {
        url: {
            type: String,
            required: [true, 'Document URL is required'],
            trim: true
        },
        title: {
            type: String,
            trim: true,
            default: ''
        },
        description: {
            type: String,
            trim: true,
            default: ''
        }
    },
    { _id: true }
);

const medicationItemSchema = new Schema(
    {
        name: {
            type: String,
            trim: true
        },
        dosage: {
            type: String,
            trim: true
        },
        frequency: {
            type: String,
            trim: true
        },
        duration: {
            type: String,
            trim: true
        },
        instructions: {
            type: String,
            trim: true
        }
    },
    { _id: false, strict: false }
);

const reportSchema = new Schema(
    {
        overallSummary: {
            type: String,
            trim: true
        },
        documents: {
            type: [documentItemSchema],
            default: [],
            alias: 'document'
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
            alias: 'userId'
        },
        reportFrom: {
            type: String,
            trim: true
        },
        medicationSuggested: {
            type: [medicationItemSchema],
            default: [],
            alias: 'medicationsSuggested'
        }
    },
    {
        timestamps: true
    }
);

const Report = mongoose.model('Report', reportSchema);

export { Report, Report as ReportDocument };
export default Report;
