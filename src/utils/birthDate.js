export function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getAdultBirthDateMaximum(value = new Date()) {
    const maximum = new Date(value);
    maximum.setFullYear(maximum.getFullYear() - 18);

    return toDateInputValue(maximum);
}

export function getMinorBirthDateLimits(value = new Date()) {
    const maximum = new Date(value);
    maximum.setDate(maximum.getDate() - 1);

    const minimum = new Date(value);
    minimum.setFullYear(minimum.getFullYear() - 18);
    minimum.setDate(minimum.getDate() + 1);

    return {
        min: toDateInputValue(minimum),
        max: toDateInputValue(maximum),
    };
}

export function getAge(birthDate, value = new Date()) {
    const date = new Date(`${birthDate}T00:00:00`);
    let age = value.getFullYear() - date.getFullYear();

    if (
        value.getMonth() < date.getMonth()
        || (
            value.getMonth() === date.getMonth()
            && value.getDate() < date.getDate()
        )
    ) {
        age -= 1;
    }

    return age;
}
