import bcrypt


def hash_password(password):
    encoded = password.encode("utf-8")
    if len(password) < 8 or len(encoded) > 72:
        raise ValueError("Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("ascii")


def verify_password(password, password_hash):
    encoded = password.encode("utf-8")
    return len(encoded) <= 72 and bcrypt.checkpw(encoded, password_hash.encode("ascii"))
