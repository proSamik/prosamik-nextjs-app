export default function Skills() {
    const skills = ["#Android", "#TeamManagement", "#JavaScript", "#DevOps"];

    return (
        <div className="px-4 py-6">
            <h2 className="text-2xl font-bold mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                    <span
                        key={index}
                        className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm"
                    >
                        {skill}
                    </span>
                ))}
            </div>
        </div>
    );
}

