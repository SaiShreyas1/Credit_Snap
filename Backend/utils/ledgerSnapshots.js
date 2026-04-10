const pickString = (value, fallback = '') => (
  typeof value === 'string' && value.trim() ? value.trim() : fallback
);

exports.buildStudentSnapshot = (student) => {
  if (!student) return null;

  const source = student.toObject ? student.toObject() : student;

  return {
    name: pickString(source.name, 'Unknown Student'),
    rollNo: pickString(source.rollNo, 'N/A'),
    phoneNo: pickString(source.phoneNo, '+91 XXXXXXXXXX'),
    hallNo: pickString(source.hallNo, 'N/A'),
    roomNo: pickString(source.roomNo, 'N/A'),
    email: pickString(source.email, 'N/A')
  };
};
