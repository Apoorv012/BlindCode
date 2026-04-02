export interface TestCase {
    input: string;
    expected: string;
    hidden: boolean;
}

export interface Challenge {
    id: number;
    title: string;
    description: string;
    expectedOutput: string;
    timeLimit: number;
    difficulty: "easy" | "medium" | "hard" | "insane";
    starterCode: Record<string, string>;
    testCases: TestCase[];
    // Optional fields from the DB Problem model
    _id?: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
}

export const CHALLENGES: Challenge[] = [
    {
        id: 1,
        title: "Hello World",
        description: "Print 'Hello, World!' to the console",
        expectedOutput: "Hello, World!",
        timeLimit: 120,
        difficulty: "easy",
        testCases: [
            { input: "", expected: "Hello, World!", hidden: false },
            { input: "ignore me", expected: "Hello, World!", hidden: false },
            { input: "123", expected: "Hello, World!", hidden: false }
        ],
        starterCode: {
            cpp: `#include <iostream>
using namespace std;

int main() {
    // Print Hello, World!
    
    return 0;
}`,
            python: `# Print Hello, World!
`,
            javascript: `// Print Hello, World!
`,
        },
    },
    {
        id: 2,
        title: "Sum of Two",
        description: "Read two numbers from standard input separated by a space or newline and print their sum.",
        expectedOutput: "30",
        timeLimit: 180,
        difficulty: "easy",
        testCases: [
            { input: "10 20", expected: "30", hidden: false },
            { input: "50 50", expected: "100", hidden: false },
            { input: "-5 15", expected: "10", hidden: false }
        ],
        starterCode: {
            cpp: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    // Read from standard input
    if (cin >> a >> b) {
        // Print the sum of a and b
        
    }
    return 0;
}`,
            python: `import sys
# Read from standard input
input_data = sys.stdin.read().split()
if len(input_data) >= 2:
    a = int(input_data[0])
    b = int(input_data[1])
    # Print the sum of a and b
`,
            javascript: `const fs = require('fs');
// Read from standard input
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2) {
    const a = parseInt(input[0]);
    const b = parseInt(input[1]);
    // Print the sum of a and b
    
}
`,
        },
    },
    {
        id: 3,
        title: "Countdown",
        description: "Read a number N from input. Print numbers from N down to 1 (each on a new line).",
        expectedOutput: "5\n4\n3\n2\n1",
        timeLimit: 240,
        difficulty: "medium",
        testCases: [
            { input: "5", expected: "5\n4\n3\n2\n1", hidden: false },
            { input: "3", expected: "3\n2\n1", hidden: false },
            { input: "1", expected: "1", hidden: false }
        ],
        starterCode: {
            cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        // Print N to 1, each on a new line
        
    }
    return 0;
}`,
            python: `import sys
input_data = sys.stdin.read().split()
if input_data:
    n = int(input_data[0])
    # Print N to 1, each on a new line
`,
            javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input[0]) {
    const n = parseInt(input[0]);
    // Print N to 1, each on a new line
    
}
`,
        },
    },
    {
        id: 4,
        title: "Factorial",
        description: "Read a number N and print its factorial.",
        expectedOutput: "120",
        timeLimit: 300,
        difficulty: "medium",
        testCases: [
            { input: "5", expected: "120", hidden: false },
            { input: "3", expected: "6", hidden: false },
            { input: "0", expected: "1", hidden: false },
            { input: "6", expected: "720", hidden: false }
        ],
        starterCode: {
            cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        // Calculate and print factorial of n
        
    }
    return 0;
}`,
            python: `import sys
input_data = sys.stdin.read().split()
if input_data:
    n = int(input_data[0])
    # Calculate and print factorial of n
`,
            javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input[0]) {
    const n = parseInt(input[0]);
    // Calculate and print factorial of n
    
}
`,
        },
    },
    {
        id: 5,
        title: "FizzBuzz Single",
        description: "Read a number N. Print 'FizzBuzz' if divisible by 3 and 5, 'Fizz' if only by 3, 'Buzz' if only by 5, else the number itself.",
        expectedOutput: "FizzBuzz",
        timeLimit: 300,
        difficulty: "hard",
        testCases: [
            { input: "15", expected: "FizzBuzz", hidden: false },
            { input: "9", expected: "Fizz", hidden: false },
            { input: "10", expected: "Buzz", hidden: false },
            { input: "7", expected: "7", hidden: false }
        ],
        starterCode: {
            cpp: `#include <iostream>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        // Implement FizzBuzz logic here
        
    }
    return 0;
}`,
            python: `import sys
input_data = sys.stdin.read().split()
if input_data:
    n = int(input_data[0])
    # Implement FizzBuzz logic here
`,
            javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input[0]) {
    const n = parseInt(input[0]);
    // Implement FizzBuzz logic here
    
}
`,
        },
    },
];