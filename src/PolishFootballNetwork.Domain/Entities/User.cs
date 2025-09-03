using PolishFootballNetwork.Domain.Common;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Exceptions;

namespace PolishFootballNetwork.Domain.Entities;

/// <summary>
/// Represents a user in the Polish Football Network system.
/// Contains user identity, authentication, and role information.
/// </summary>
public class User : Entity
{
    private readonly List<File> _uploadedFiles = new();

    /// <summary>
    /// Gets the username of the user.
    /// </summary>
    public string Username { get; private set; }

    /// <summary>
    /// Gets the email address of the user.
    /// </summary>
    public string Email { get; private set; }

    /// <summary>
    /// Gets the first name of the user.
    /// </summary>
    public string FirstName { get; private set; }

    /// <summary>
    /// Gets the last name of the user.
    /// </summary>
    public string LastName { get; private set; }

    /// <summary>
    /// Gets the role of the user in the system.
    /// </summary>
    public UserRole Role { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the user's email has been verified.
    /// </summary>
    public bool IsEmailVerified { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the user account is active.
    /// </summary>
    public bool IsActive { get; private set; }

    /// <summary>
    /// Gets the date and time when the user last logged in.
    /// </summary>
    public DateTime? LastLoginAt { get; private set; }

    /// <summary>
    /// Gets the full name of the user.
    /// </summary>
    public string FullName => $"{FirstName} {LastName}".Trim();

    /// <summary>
    /// Gets a read-only collection of files uploaded by this user.
    /// </summary>
    public IReadOnlyCollection<File> UploadedFiles => _uploadedFiles.AsReadOnly();

    /// <summary>
    /// Initializes a new instance of the User class. Used by EF Core.
    /// </summary>
    private User() : base()
    {
        Username = string.Empty;
        Email = string.Empty;
        FirstName = string.Empty;
        LastName = string.Empty;
        IsActive = true;
    }

    /// <summary>
    /// Initializes a new instance of the User class with the specified parameters.
    /// </summary>
    /// <param name="username">The username of the user.</param>
    /// <param name="email">The email address of the user.</param>
    /// <param name="firstName">The first name of the user.</param>
    /// <param name="lastName">The last name of the user.</param>
    /// <param name="role">The role of the user in the system.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when validation fails.</exception>
    public User(string username, string email, string firstName, string lastName, UserRole role = UserRole.User)
    {
        SetUsername(username);
        SetEmail(email);
        SetFirstName(firstName);
        SetLastName(lastName);
        Role = role;
        IsActive = true;
        IsEmailVerified = false;
    }

    /// <summary>
    /// Updates the username of the user.
    /// </summary>
    /// <param name="username">The new username.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when the username is invalid.</exception>
    public void UpdateUsername(string username)
    {
        string oldUsername = Username;
        SetUsername(username);
        
        if (oldUsername != Username)
        {
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the email address of the user.
    /// </summary>
    /// <param name="email">The new email address.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when the email is invalid.</exception>
    public void UpdateEmail(string email)
    {
        string oldEmail = Email;
        SetEmail(email);
        
        if (oldEmail != Email)
        {
            IsEmailVerified = false; // Reset verification when email changes
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the first name of the user.
    /// </summary>
    /// <param name="firstName">The new first name.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when the first name is invalid.</exception>
    public void UpdateFirstName(string firstName)
    {
        string oldFirstName = FirstName;
        SetFirstName(firstName);
        
        if (oldFirstName != FirstName)
        {
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the last name of the user.
    /// </summary>
    /// <param name="lastName">The new last name.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when the last name is invalid.</exception>
    public void UpdateLastName(string lastName)
    {
        string oldLastName = LastName;
        SetLastName(lastName);
        
        if (oldLastName != LastName)
        {
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the role of the user.
    /// </summary>
    /// <param name="role">The new role.</param>
    public void UpdateRole(UserRole role)
    {
        if (Role != role)
        {
            Role = role;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Marks the user's email as verified.
    /// </summary>
    public void VerifyEmail()
    {
        if (!IsEmailVerified)
        {
            IsEmailVerified = true;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Activates the user account.
    /// </summary>
    public void Activate()
    {
        if (!IsActive)
        {
            IsActive = true;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Deactivates the user account.
    /// </summary>
    public void Deactivate()
    {
        if (IsActive)
        {
            IsActive = false;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Records a login event for the user.
    /// </summary>
    public void RecordLogin()
    {
        LastLoginAt = DateTime.UtcNow;
        UpdateModifiedAt();
    }

    /// <summary>
    /// Determines if the user has administrative privileges.
    /// </summary>
    /// <returns>true if the user is an administrator; otherwise, false.</returns>
    public bool IsAdministrator()
    {
        return Role == UserRole.Administrator;
    }

    /// <summary>
    /// Determines if the user has moderator privileges.
    /// </summary>
    /// <returns>true if the user is a moderator or administrator; otherwise, false.</returns>
    public bool IsModerator()
    {
        return Role == UserRole.Moderator || Role == UserRole.Administrator;
    }

    /// <summary>
    /// Determines if the user can perform the specified action based on their role.
    /// </summary>
    /// <param name="requiredRole">The minimum role required to perform the action.</param>
    /// <returns>true if the user can perform the action; otherwise, false.</returns>
    public bool CanPerformAction(UserRole requiredRole)
    {
        return Role >= requiredRole;
    }

    /// <summary>
    /// Adds a file to the user's uploaded files collection.
    /// </summary>
    /// <param name="file">The file to add.</param>
    /// <exception cref="ArgumentNullException">Thrown when file is null.</exception>
    /// <exception cref="BusinessRuleValidationException">Thrown when the file's uploader doesn't match this user.</exception>
    internal void AddUploadedFile(File file)
    {
        if (file == null)
            throw new ArgumentNullException(nameof(file));

        if (file.UploadedByUserId != Id)
            throw new BusinessRuleValidationException("File uploader must match this user.", nameof(File));

        _uploadedFiles.Add(file);
    }

    /// <summary>
    /// Removes a file from the user's uploaded files collection.
    /// </summary>
    /// <param name="file">The file to remove.</param>
    /// <exception cref="ArgumentNullException">Thrown when file is null.</exception>
    internal void RemoveUploadedFile(File file)
    {
        if (file == null)
            throw new ArgumentNullException(nameof(file));

        _uploadedFiles.Remove(file);
    }

    /// <summary>
    /// Gets the number of files uploaded by this user.
    /// </summary>
    /// <returns>The count of uploaded files.</returns>
    public int GetUploadedFileCount()
    {
        return _uploadedFiles.Count;
    }

    /// <summary>
    /// Gets the total size of all files uploaded by this user.
    /// </summary>
    /// <returns>The total size in bytes.</returns>
    public long GetTotalUploadedFileSize()
    {
        return _uploadedFiles.Sum(f => f.SizeInBytes);
    }

    private void SetUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new BusinessRuleValidationException("Username cannot be empty.", nameof(Username));

        if (username.Length < 3)
            throw new BusinessRuleValidationException("Username must be at least 3 characters long.", nameof(Username));

        if (username.Length > 50)
            throw new BusinessRuleValidationException("Username cannot exceed 50 characters.", nameof(Username));

        if (!IsValidUsername(username))
            throw new BusinessRuleValidationException("Username can only contain letters, numbers, underscores, and hyphens.", nameof(Username));

        Username = username.Trim().ToLowerInvariant();
    }

    private void SetEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new BusinessRuleValidationException("Email cannot be empty.", nameof(Email));

        if (email.Length > 254)
            throw new BusinessRuleValidationException("Email cannot exceed 254 characters.", nameof(Email));

        if (!IsValidEmail(email))
            throw new BusinessRuleValidationException("Email format is invalid.", nameof(Email));

        Email = email.Trim().ToLowerInvariant();
    }

    private void SetFirstName(string firstName)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new BusinessRuleValidationException("First name cannot be empty.", nameof(FirstName));

        if (firstName.Length > 50)
            throw new BusinessRuleValidationException("First name cannot exceed 50 characters.", nameof(FirstName));

        FirstName = firstName.Trim();
    }

    private void SetLastName(string lastName)
    {
        if (string.IsNullOrWhiteSpace(lastName))
            throw new BusinessRuleValidationException("Last name cannot be empty.", nameof(LastName));

        if (lastName.Length > 50)
            throw new BusinessRuleValidationException("Last name cannot exceed 50 characters.", nameof(LastName));

        LastName = lastName.Trim();
    }

    private static bool IsValidUsername(string username)
    {
        // Username can contain letters, numbers, underscores, and hyphens
        return username.All(c => char.IsLetterOrDigit(c) || c == '_' || c == '-');
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
