import mongoose, { Schema } from 'mongoose';

const guidelineSchema = new Schema(
    {
        whenToApply: {
            type: String,
            required: [true, 'When to apply is required'],
            trim: true
        },
        whenNotToApply: {
            type: String,
            required: [true, 'When not to apply is required'],
            trim: true
        },
        strictRule: {
            type: String,
            required: [true, 'Strict rule is required'],
            trim: true
        },
        outputFormat: {
            type: String,
            required: [true, 'Output format is required'],
            trim: true
        },
        mainRuleSet: {
            type: String,
            required: [true, 'Main rule set is required'],
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const Guideline = mongoose.model('Guideline', guidelineSchema);

export { Guideline, Guideline as Guidelines };
export default Guideline;
