const { Storage } = require('@google-cloud/storage');
const path = require('path');

const keyFilePath = path.join(process.cwd(), 'credentials', 'gcs.json');
const storage = new Storage({ keyFilename: keyFilePath });
const bucketName = 'voxlab-storage';

async function makePublicIam() {
    try {
        const bucket = storage.bucket(bucketName);

        // 1. Disable Public Access Prevention (PAP)
        console.log('Disabling Public Access Prevention...');
        // setIamConfiguration might support 'publicAccessPrevention': 'inherited'
        // But usually it's set on the bucket metadata or via specific method?
        // Node.js SDK: bucket.setMetadata({ iamConfiguration: { publicAccessPrevention: 'inherited' } })

        await bucket.setMetadata({
            iamConfiguration: {
                publicAccessPrevention: 'inherited' // 'enforced' or 'inherited'
            }
        });
        console.log('PAP Disabled (set to inherited).');

        // 2. Update IAM Policy
        const [policy] = await bucket.iam.getPolicy({ requestedPolicyVersion: 3 });

        const role = 'roles/storage.objectViewer';
        const member = 'allUsers';

        let binding = policy.bindings.find(b => b.role === role);
        if (!binding) {
            console.log('Creating new binding for role ' + role);
            binding = { role: role, members: [] };
            policy.bindings.push(binding);
        }

        if (!binding.members.includes(member)) {
            console.log('Adding allUsers to binding...');
            binding.members.push(member);

            await bucket.iam.setPolicy(policy);
            console.log(`Updated IAM policy: ${bucketName} is now PUBLIC for reading.`);
        } else {
            console.log(`Bucket ${bucketName} is ALREADY public (allUsers has objectViewer).`);
        }

    } catch (err) {
        console.error('Error updating bucket: ' + err.message);
        if (err.errors) console.error(JSON.stringify(err.errors));
    }
}

makePublicIam();
