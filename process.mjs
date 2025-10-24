export const process = (store, order) => {
    const stock = {};
    const usedMasks = {};

    store.forEach(({ size, quantity }) => {
        stock[size] = quantity;
    });

    const result = {
        stats: [],
        assignment: [],
        mismatches: 0
    };

    const required = {};
    for (const item of order) {
        const { size, masterSize } = item;
        const [size1, size2] = size;
        if (size.length === 1) {
            required[size1] = (required[size1] || 0) + 1;
        } else {
            const preferred = masterSize === "s1" ? size1 : size2;
            if (stock[size1] > 0 || stock[size2] > 0) {
                required[preferred] = (required[preferred] || 0) + 1;
            } else {
                return false;
            }
        }
    }

    for (const size in required) {
        if ((stock[size] || 0) < required[size]) {
            let needed = required[size] - (stock[size] || 0);
            for (const item of order) {
                if (item.size.length === 2) {
                    const [size1, size2] = item.size;
                    const preferred = item.masterSize === "s1" ? size1 : size2;
                    const secondary = item.masterSize === "s1" ? size2 : size1;
                    if (preferred === Number(size) && stock[secondary] > 0) {
                        stock[secondary]--;
                        needed--;
                        if (needed === 0) break;
                    }
                }
            }
            if (needed > 0) return false;
        }
    }

    store.forEach(({ size, quantity }) => {
        stock[size] = quantity;
    });

    for (const item of order) {
        const { id, size } = item;
        const [size1] = size;

        if (size.length === 1 && stock[size1] > 0) {
            stock[size1]--;
            result.assignment.push({ id, size: size1 });
            usedMasks[size1] = (usedMasks[size1] || 0) + 1;
        }
    }

    const twoSizeOrders = order
        .filter(item => item.size.length === 2)
        .sort((a, b) => {
            const aSecondary = a.masterSize === "s1" ? a.size[1] : a.size[0];
            const bSecondary = b.masterSize === "s1" ? b.size[1] : b.size[0];
            return (stock[aSecondary] || 0) - (stock[bSecondary] || 0);
        });

    for (const item of twoSizeOrders) {
        const { id, size, masterSize } = item;
        const [size1, size2] = size;
        const preferred = masterSize === "s1" ? size1 : size2;
        const secondary = masterSize === "s1" ? size2 : size1;

        if (!result.assignment.find(a => a.id === id)) {
            if (stock[preferred] > 0) {
                stock[preferred]--;
                result.assignment.push({ id, size: preferred });
                usedMasks[preferred] = (usedMasks[preferred] || 0) + 1;
            } else if (stock[secondary] > 0) {
                stock[secondary]--;
                result.assignment.push({ id, size: secondary });
                usedMasks[secondary] = (usedMasks[secondary] || 0) + 1;
                result.mismatches++;
            } else {
                return false;
            }
        }
    }

    result.stats = Object.entries(usedMasks)
        .map(([size, quantity]) => ({ size: Number(size), quantity }))
        .sort((a, b) => a.size - b.size);

    return result;
};
